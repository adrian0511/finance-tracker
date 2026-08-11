package com.adrian.financetracker_monolith_api.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.data.domain.PageRequest;

import com.adrian.financetracker_monolith_api.dto.goal.MonthlyNet;
import com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse;
import com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse;
import com.adrian.financetracker_monolith_api.entity.Account;
import com.adrian.financetracker_monolith_api.entity.Transaction;
import com.adrian.financetracker_monolith_api.entity.User;
import com.adrian.financetracker_monolith_api.util.Role;
import com.adrian.financetracker_monolith_api.util.Type;

/**
 * Las agregaciones (acumulados, sumas por mes, por categoria) se hacen en la base de datos, asi
 * que con mocks no se pueden comprobar: solo se veria devuelto lo que el propio test inventa.
 * Estos tests van contra el Postgres local, el mismo que usa la app, y hacen rollback al acabar
 * ({@code @DataJpaTest} es transaccional). Sin Postgres levantado no corren.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DisplayName("Agregaciones en SQL de TransactionRepository")
class TransactionRepositoryAggregateTest {

    private static final LocalDateTime START = LocalDate.of(2026, 3, 1).atStartOfDay();
    private static final LocalDateTime END = LocalDate.of(2026, 3, 31).atTime(LocalTime.MAX);

    @Autowired
    private TestEntityManager em;
    @Autowired
    private TransactionRepository repository;
    @Autowired
    private AccountRepository accountRepository;

    private User user;
    private Account account;

    @BeforeEach
    void setUp() {
        user = em.persist(User.builder()
                .username("range-test-" + UUID.randomUUID())
                .password("irrelevante")
                .role(Role.USER)
                .build());

        account = em.persist(Account.builder()
                .name("Corriente")
                .balance(new BigDecimal("100.00"))
                .user(user)
                .build());
    }

    @Test
    @DisplayName("findCashFlow acumula el balance corriente movimiento a movimiento")
    void cashFlowAccumulatesTheRunningBalance() {
        tx("2026-03-01T09:00", Type.INCOME, "100.00", "Nomina");
        tx("2026-03-05T09:00", Type.EXPENSE, "30.00", "Comida");
        tx("2026-03-09T09:00", Type.INCOME, "5.50", "Extra");
        em.flush();

        List<CashFlowResponse> cashFlow = repository.findCashFlow(user.getId(), START, END);

        assertThat(cashFlow).extracting(CashFlowResponse::getBalance)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("100.00"), new BigDecimal("70.00"), new BigDecimal("75.50"));
    }

    @Test
    @DisplayName("findCashFlow da a cada movimiento su acumulado aunque compartan fecha exacta")
    void cashFlowBreaksTiesInsteadOfSharingTheSameTotal() {
        // Mismo instante en los tres: con el marco RANGE por defecto los tres se llevarian el
        // acumulado del grupo entero (150, 150, 150) en vez de 50, 100 y 150.
        tx("2026-03-04T12:00", Type.INCOME, "50.00", "Uno");
        tx("2026-03-04T12:00", Type.INCOME, "50.00", "Dos");
        tx("2026-03-04T12:00", Type.INCOME, "50.00", "Tres");
        em.flush();

        List<CashFlowResponse> cashFlow = repository.findCashFlow(user.getId(), START, END);

        assertThat(cashFlow).extracting(CashFlowResponse::getBalance)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("50.00"), new BigDecimal("100.00"), new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("findCashFlow deja fuera lo que cae fuera del rango")
    void cashFlowRespectsTheRange() {
        tx("2026-02-28T23:00", Type.INCOME, "999.00", "Antes");
        tx("2026-03-10T10:00", Type.INCOME, "10.00", "Dentro");
        tx("2026-04-01T00:30", Type.INCOME, "999.00", "Despues");
        em.flush();

        List<CashFlowResponse> cashFlow = repository.findCashFlow(user.getId(), START, END);

        assertThat(cashFlow).hasSize(1);
        assertThat(cashFlow.get(0).getBalance()).isEqualByComparingTo("10.00");
    }

    @Test
    @DisplayName("findMonthlyNets suma por mes y no mezcla el mismo mes de anos distintos")
    void monthlyNetsGroupByYearAndMonth() {
        tx("2025-03-10T10:00", Type.INCOME, "70.00", "Marzo del ano pasado");
        tx("2026-03-10T10:00", Type.INCOME, "300.00", "Nomina");
        tx("2026-03-20T10:00", Type.EXPENSE, "120.00", "Alquiler");
        tx("2026-04-02T10:00", Type.EXPENSE, "50.00", "Abril");
        em.flush();

        List<MonthlyNet> nets = repository.findMonthlyNets(user.getId(),
                LocalDate.of(2025, 1, 1).atStartOfDay(), LocalDate.of(2026, 12, 31).atTime(LocalTime.MAX));

        // Los netos se comparan con compareTo: la base de datos devuelve 1.8E+2 y equals mira
        // la escala, asi que 180 y 1.8E+2 no serian "iguales".
        assertThat(nets).extracting(MonthlyNet::month)
                .containsExactly(YearMonth.of(2025, 3), YearMonth.of(2026, 3), YearMonth.of(2026, 4));
        assertThat(nets.get(0).getNet()).isEqualByComparingTo("70");
        assertThat(nets.get(1).getNet()).isEqualByComparingTo("180");
        assertThat(nets.get(2).getNet()).isEqualByComparingTo("-50");
    }

    @Test
    @DisplayName("findExpensesByCategory ignora los ingresos y ordena de mayor a menor gasto")
    void expensesByCategoryAreSortedDescending() {
        tx("2026-03-02T10:00", Type.EXPENSE, "40.00", "Comida");
        tx("2026-03-03T10:00", Type.EXPENSE, "35.00", "Comida");
        tx("2026-03-04T10:00", Type.EXPENSE, "200.00", "Vivienda");
        tx("2026-03-05T10:00", Type.EXPENSE, "10.00", null);
        tx("2026-03-06T10:00", Type.INCOME, "5000.00", "Nomina");
        em.flush();

        List<CategoryReportResponse> byCategory =
                repository.findExpensesByCategory(user.getId(), START, END);

        assertThat(byCategory).extracting(CategoryReportResponse::getCategory)
                .containsExactly("Vivienda", "Comida", null);
        assertThat(byCategory.get(1).getTotal()).isEqualByComparingTo("75.00");
    }

    @Test
    @DisplayName("los totales del rango separan ingresos de gastos y devuelven 0 si no hay nada")
    void totalsSplitIncomesAndExpenses() {
        tx("2026-03-02T10:00", Type.INCOME, "500.00", "Nomina");
        tx("2026-03-03T10:00", Type.EXPENSE, "125.50", "Comida");
        em.flush();

        assertThat(repository.totalIncomes(user.getId(), START, END)).isEqualByComparingTo("500.00");
        assertThat(repository.totalExpenses(user.getId(), START, END)).isEqualByComparingTo("125.50");
        assertThat(repository.countByUserAndDateBetween(user.getId(), START, END)).isEqualTo(2);

        LocalDateTime otherMonth = LocalDate.of(2026, 1, 1).atStartOfDay();
        assertThat(repository.totalIncomes(user.getId(), otherMonth, otherMonth.plusDays(1)))
                .isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("findRecentTransactions corta en la base de datos y devuelve las mas recientes")
    void recentTransactionsAreLimitedAndSortedDescending() {
        tx("2026-03-01T10:00", Type.INCOME, "1.00", "Vieja");
        tx("2026-03-02T10:00", Type.INCOME, "2.00", "Media");
        tx("2026-03-03T10:00", Type.INCOME, "3.00", "Nueva");
        em.flush();

        List<Transaction> recent = repository.findRecentTransactions(user.getId(), PageRequest.of(0, 2));

        assertThat(recent).extracting(Transaction::getCategory).containsExactly("Nueva", "Media");
    }

    @Test
    @DisplayName("totalBalance suma las cuentas del usuario y no las de otros")
    void totalBalanceAddsUpOnlyTheUsersAccounts() {
        em.persist(Account.builder().name("Ahorro").balance(new BigDecimal("50.50")).user(user).build());

        User other = em.persist(User.builder()
                .username("otro-" + UUID.randomUUID())
                .password("irrelevante")
                .role(Role.USER)
                .build());
        em.persist(Account.builder().name("Ajena").balance(new BigDecimal("9999")).user(other).build());
        em.flush();

        assertThat(accountRepository.totalBalance(user.getId())).isEqualByComparingTo("150.50");
        assertThat(accountRepository.totalBalance(UUID.randomUUID())).isEqualByComparingTo("0");
    }

    private void tx(String date, Type type, String amount, String category) {
        em.persist(Transaction.builder()
                .account(account)
                .date(LocalDateTime.parse(date))
                .type(type)
                .amount(new BigDecimal(amount))
                .category(category)
                .build());
    }
}
