package com.adrian.financetracker_monolith_api.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.adrian.financetracker_monolith_api.dto.goal.MonthlyNet;
import com.adrian.financetracker_monolith_api.dto.goal.ProjectionPoint;
import com.adrian.financetracker_monolith_api.dto.goal.SavingsProjectionResponse;
import com.adrian.financetracker_monolith_api.entity.SavingsGoal;
import com.adrian.financetracker_monolith_api.entity.Transaction;
import com.adrian.financetracker_monolith_api.exception.goal.SavingsGoalNotFoundException;
import com.adrian.financetracker_monolith_api.mapper.SavingsGoalMapper;
import com.adrian.financetracker_monolith_api.repository.AccountRepository;
import com.adrian.financetracker_monolith_api.repository.SavingsGoalRepository;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.util.Type;

@ExtendWith(MockitoExtension.class)
@DisplayName("SavingsGoalServiceImpl.project")
class SavingsGoalServiceImplProjectionTest {

    /**
     * Reloj fijo: sin el, los ETA se comparaban contra YearMonth.now() real y un test lanzado
     * justo en el cambio de mes podia fallar. Con la fecha clavada, los meses esperados se
     * pueden escribir literales y el resultado no depende de cuando se ejecute la suite.
     */
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-06-15T12:00:00Z"), ZoneOffset.UTC);

    /** El mes que "es" para el servicio. Los 6 meses cerrados van de 2025-12 a 2026-05. */
    private static final YearMonth NOW = YearMonth.of(2026, 6);
    private static final LocalDate TODAY = LocalDate.of(2026, 6, 15);

    private static final UUID GOAL_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();

    @Mock
    private SavingsGoalRepository repository;
    @Mock
    private SavingsGoalMapper mapper;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private TransactionRepository transactionRepository;

    private SavingsGoalServiceImpl service;

    @BeforeEach
    void setUp() {
        // Construccion manual en vez de @InjectMocks: el Clock no es un mock, es una
        // dependencia real que queremos controlar.
        service = new SavingsGoalServiceImpl(
                repository, mapper, userRepository, accountRepository, transactionRepository, CLOCK);
    }

    @Test
    @DisplayName("una meta de otro usuario responde 404, no 403, para no revelar que existe")
    void goalOfAnotherUserIsNotFound() {
        when(repository.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.project(GOAL_ID, USER_ID))
                .isInstanceOf(SavingsGoalNotFoundException.class)
                .hasMessageContaining(GOAL_ID.toString());
    }

    @Test
    @DisplayName("el mes en curso queda fuera de la ventana: solo se miran los 6 meses cerrados")
    void currentPartialMonthIsExcludedFromTheWindow() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances();
        givenTransactions();

        service.project(GOAL_ID, USER_ID);

        ArgumentCaptor<LocalDateTime> start = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> end = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(transactionRepository).findMonthlyNets(eq(USER_ID), start.capture(), end.capture());

        // Estando en junio de 2026, la ventana va del 1 de diciembre de 2025 al final de mayo.
        assertThat(start.getValue()).isEqualTo(LocalDate.of(2025, 12, 1).atStartOfDay());
        assertThat(end.getValue()).isEqualTo(LocalDate.of(2026, 5, 31).atTime(LocalTime.MAX));
    }

    @Test
    @DisplayName("ritmo constante: media 100, desviacion 0 y los tres escenarios coinciden")
    void constantSavingRateGivesTheSameEtaInEveryScenario() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances();
        givenTransactions(
                income(1, 100), income(2, 100), income(3, 100),
                income(4, 100), income(5, 100), income(6, 100));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getAverageMonthlyNet()).isEqualByComparingTo("100.00");
        assertThat(projection.getMonthlyNetStdDeviation()).isEqualByComparingTo("0.00");
        assertThat(projection.getRemainingAmount()).isEqualByComparingTo("1000");

        // 1000 a 100 por mes son 10 meses: junio de 2026 + 10 = abril de 2027
        assertThat(projection.getRealisticEta()).isEqualTo(YearMonth.of(2027, 4));
        assertThat(projection.getOptimisticEta()).isEqualTo(YearMonth.of(2027, 4));
        assertThat(projection.getPessimisticEta()).isEqualTo(YearMonth.of(2027, 4));
    }

    @Test
    @DisplayName("los meses sin movimientos cuentan como 0, no se omiten del promedio")
    void monthsWithoutTransactionsCountAsZero() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances();
        // 600 repartidos en 3 de los 6 meses. Si los meses vacios se ignorasen la media
        // seria 200; contandolos como 0 es 100.
        givenTransactions(income(2, 200), income(4, 200), income(6, 200));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getAverageMonthlyNet()).isEqualByComparingTo("100.00");
        assertThat(projection.getMonthlyNetStdDeviation()).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("con ahorro irregular el optimista adelanta y el pesimista puede no llegar nunca")
    void irregularSavingSeparatesTheScenarios() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances();
        givenTransactions(income(2, 200), income(4, 200), income(6, 200));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        // media 100, desviacion 100 -> optimista 200/mes (5 meses), pesimista 0/mes (nunca)
        assertThat(projection.getOptimisticEta()).isEqualTo(YearMonth.of(2026, 11));
        assertThat(projection.getRealisticEta()).isEqualTo(YearMonth.of(2027, 4));
        assertThat(projection.getPessimisticEta()).isNull();
    }

    @Test
    @DisplayName("el neto resta los gastos de los ingresos del mismo mes")
    void expensesAreSubtractedFromIncomes() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances();
        givenTransactions(
                income(1, 300), expense(1, 200),
                income(2, 300), expense(2, 200),
                income(3, 300), expense(3, 200),
                income(4, 300), expense(4, 200),
                income(5, 300), expense(5, 200),
                income(6, 300), expense(6, 200));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getAverageMonthlyNet()).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("sin movimientos no hay ritmo y ningun escenario alcanza la meta")
    void noTransactionsMeansNoEta() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances();
        givenTransactions();

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getAverageMonthlyNet()).isEqualByComparingTo("0.00");
        assertThat(projection.getOptimisticEta()).isNull();
        assertThat(projection.getRealisticEta()).isNull();
        assertThat(projection.getPessimisticEta()).isNull();
    }

    @Test
    @DisplayName("gastando mas de lo que se ingresa el ritmo es negativo y no hay ETA")
    void negativeSavingRateHasNoEta() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances();
        givenTransactions(
                income(1, 100), expense(1, 300),
                income(2, 100), expense(2, 300));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getAverageMonthlyNet()).isNegative();
        assertThat(projection.getRealisticEta()).isNull();
    }

    @Test
    @DisplayName("un ritmo diminuto cae fuera del horizonte y devuelve null en vez de desbordar")
    void unreachableRateFallsOutsideTheHorizon() {
        givenGoal(BigDecimal.valueOf(1_000_000), null);
        givenBalances();
        givenTransactions(income(1, 1));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        // 1 entre 6 meses -> 0.17/mes: harian falta casi 6 millones de meses
        assertThat(projection.getRealisticEta()).isNull();
    }

    @Test
    @DisplayName("si el balance ya cubre la meta, falta 0 y los tres ETA son el mes actual")
    void alreadyReachedGoalResolvesToTheCurrentMonth() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances(BigDecimal.valueOf(1500));
        givenTransactions(income(1, 50));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getCurrentBalance()).isEqualByComparingTo("1500");
        assertThat(projection.getRemainingAmount()).isEqualByComparingTo("0");
        assertThat(projection.getRealisticEta()).isEqualTo(NOW);
        assertThat(projection.getOptimisticEta()).isEqualTo(NOW);
        assertThat(projection.getPessimisticEta()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("el balance actual suma todas las cuentas del usuario")
    void currentBalanceAddsUpEveryAccount() {
        givenGoal(BigDecimal.valueOf(5000), null);
        givenBalances(BigDecimal.valueOf(300), BigDecimal.valueOf(150.50));
        givenTransactions(income(1, 100));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getCurrentBalance()).isEqualByComparingTo("450.50");
    }

    @Test
    @DisplayName("sin targetDate no se evalua el plazo")
    void withoutTargetDateThereIsNoDeadlineCheck() {
        givenGoal(BigDecimal.valueOf(1000), null);
        givenBalances();
        givenTransactions(income(1, 600));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getOnTrackForTargetDate()).isNull();
        assertThat(projection.getAdditionalMonthlySavingsNeeded()).isNull();
    }

    @Test
    @DisplayName("llegando antes del plazo, va a tiempo y no hace falta ahorrar de mas")
    void onTrackWhenTheEtaFitsBeforeTheTargetDate() {
        // 100/mes y faltan 1000 -> 10 meses; el plazo son 24
        givenGoal(BigDecimal.valueOf(1000), TODAY.plusMonths(24));
        givenBalances();
        givenTransactions(
                income(1, 100), income(2, 100), income(3, 100),
                income(4, 100), income(5, 100), income(6, 100));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getOnTrackForTargetDate()).isTrue();
        assertThat(projection.getAdditionalMonthlySavingsNeeded()).isNull();
    }

    @Test
    @DisplayName("si no se llega a tiempo, calcula cuanto hay que ahorrar de mas cada mes")
    void offTrackReportsTheExtraMonthlySavingNeeded() {
        // 100/mes y faltan 1000 -> 10 meses, pero el plazo son 5:
        // hacen falta 200/mes, o sea 100 mas de los que se ahorran
        givenGoal(BigDecimal.valueOf(1000), TODAY.plusMonths(5));
        givenBalances();
        givenTransactions(
                income(1, 100), income(2, 100), income(3, 100),
                income(4, 100), income(5, 100), income(6, 100));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getOnTrackForTargetDate()).isFalse();
        assertThat(projection.getAdditionalMonthlySavingsNeeded()).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("con el plazo ya vencido hace falta el importe completo de golpe")
    void expiredTargetDateNeedsTheWholeRemainingAmount() {
        givenGoal(BigDecimal.valueOf(1000), TODAY.minusMonths(2));
        givenBalances(BigDecimal.valueOf(400));
        givenTransactions(income(1, 100));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);

        assertThat(projection.getOnTrackForTargetDate()).isFalse();
        assertThat(projection.getAdditionalMonthlySavingsNeeded()).isEqualByComparingTo("600");
    }

    @Test
    @DisplayName("el breakdown son 24 meses consecutivos con el balance acumulado de cada escenario")
    void breakdownHasTwentyFourConsecutiveMonths() {
        givenGoal(BigDecimal.valueOf(10_000), null);
        givenBalances(BigDecimal.valueOf(500));
        givenTransactions(
                income(1, 100), income(2, 100), income(3, 100),
                income(4, 100), income(5, 100), income(6, 100));

        SavingsProjectionResponse projection = service.project(GOAL_ID, USER_ID);
        List<ProjectionPoint> breakdown = projection.getMonthlyBreakdown();

        assertThat(breakdown).hasSize(24);
        assertThat(breakdown.get(0).getMonth()).isEqualTo(YearMonth.of(2026, 7));
        assertThat(breakdown.get(23).getMonth()).isEqualTo(YearMonth.of(2028, 6));

        // ritmo constante 100 y desviacion 0: 500 + 100 * mes en los tres escenarios
        assertThat(breakdown.get(0).getRealisticBalance()).isEqualByComparingTo("600.00");
        assertThat(breakdown.get(23).getRealisticBalance()).isEqualByComparingTo("2900.00");
        assertThat(breakdown.get(23).getOptimisticBalance()).isEqualByComparingTo("2900.00");
        assertThat(breakdown.get(23).getPessimisticBalance()).isEqualByComparingTo("2900.00");
    }

    // ---------- helpers ----------

    private void givenGoal(BigDecimal targetAmount, LocalDate targetDate) {
        SavingsGoal goal = SavingsGoal.builder()
                .id(GOAL_ID)
                .name("Meta de prueba")
                .targetAmount(targetAmount)
                .targetDate(targetDate)
                .createdAt(TODAY.atStartOfDay())
                .build();

        when(repository.findByIdAndUserId(GOAL_ID, USER_ID)).thenReturn(Optional.of(goal));
    }

    /** La suma la hace ahora la query, asi que el mock devuelve el total, no las cuentas. */
    private void givenBalances(BigDecimal... balances) {
        BigDecimal total = Arrays.stream(balances).reduce(BigDecimal.ZERO, BigDecimal::add);

        when(accountRepository.totalBalance(USER_ID)).thenReturn(total);
    }

    /**
     * Los movimientos se agregan por mes aqui, igual que hace findMonthlyNets en la base de
     * datos. Los tests siguen escribiendose con ingresos y gastos sueltos porque es como se
     * razona sobre la proyeccion; lo que cambia es donde se suman, no que se espera.
     */
    private void givenTransactions(Transaction... transactions) {
        Map<YearMonth, BigDecimal> netByMonth = new TreeMap<>();
        for (Transaction t : transactions) {
            BigDecimal signed = t.getType() == Type.INCOME ? t.getAmount() : t.getAmount().negate();
            netByMonth.merge(YearMonth.from(t.getDate()), signed, BigDecimal::add);
        }

        List<MonthlyNet> nets = netByMonth.entrySet().stream()
                .map(e -> new MonthlyNet(e.getKey().getYear(), e.getKey().getMonthValue(), e.getValue()))
                .toList();

        when(transactionRepository.findMonthlyNets(any(), any(), any())).thenReturn(nets);
    }

    /** Un ingreso en el mes cerrado numero {@code monthsAgo} (1 = mayo de 2026). */
    private Transaction income(int monthsAgo, double amount) {
        return transaction(monthsAgo, amount, Type.INCOME);
    }

    private Transaction expense(int monthsAgo, double amount) {
        return transaction(monthsAgo, amount, Type.EXPENSE);
    }

    private Transaction transaction(int monthsAgo, double amount, Type type) {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .amount(BigDecimal.valueOf(amount))
                .type(type)
                .category("Test")
                .date(NOW.minusMonths(monthsAgo).atDay(15).atStartOfDay())
                .build();
    }

}
