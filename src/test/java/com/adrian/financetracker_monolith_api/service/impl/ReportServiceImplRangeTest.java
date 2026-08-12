package com.adrian.financetracker_monolith_api.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.adrian.financetracker_monolith_api.dto.report.BalanceResponse;
import com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse;
import com.adrian.financetracker_monolith_api.exception.report.InvalidDateRangeException;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportServiceImpl: rango from/to")
class ReportServiceImplRangeTest {

    /** Reloj fijo: sin el, el rango por defecto dependeria del dia en que se lance la suite. */
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-11T10:00:00Z"), ZoneOffset.UTC);

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 11);
    private static final LocalDateTime DEFAULT_START = LocalDate.of(2026, 2, 11).atStartOfDay();
    private static final LocalDateTime DEFAULT_END = TODAY.atTime(LocalTime.MAX);

    private static final UUID USER_ID = UUID.randomUUID();

    @Mock
    private TransactionRepository repository;

    private ReportServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ReportServiceImpl(repository, CLOCK);
    }

    @Nested
    @DisplayName("resolucion del rango")
    class RangeResolution {

        @Test
        @DisplayName("sin from ni to usa los ultimos 6 meses hasta hoy")
        void defaultsToLastSixMonths() {
            when(repository.totalIncomes(eq(USER_ID), any(), any())).thenReturn(BigDecimal.ZERO);
            when(repository.totalExpenses(eq(USER_ID), any(), any())).thenReturn(BigDecimal.ZERO);

            service.getBalance(USER_ID, null, null);

            verify(repository).totalIncomes(USER_ID, DEFAULT_START, DEFAULT_END);
            verify(repository).totalExpenses(USER_ID, DEFAULT_START, DEFAULT_END);
        }

        @Test
        @DisplayName("con from y to usa el rango pedido, con el dia final completo")
        void usesExplicitRange() {
            LocalDate from = LocalDate.of(2026, 1, 1);
            LocalDate to = LocalDate.of(2026, 3, 31);

            service.getByCategory(USER_ID, from, to);

            verify(repository).findExpensesByCategory(USER_ID, from.atStartOfDay(), to.atTime(LocalTime.MAX));
        }

        @Test
        @DisplayName("solo con from, el final es hoy")
        void onlyFromEndsToday() {
            LocalDate from = LocalDate.of(2025, 5, 20);

            service.getByCategory(USER_ID, from, null);

            verify(repository).findExpensesByCategory(USER_ID, from.atStartOfDay(), DEFAULT_END);
        }

        @Test
        @DisplayName("solo con to, el inicio son 6 meses antes de to (no de hoy)")
        void onlyToStartsSixMonthsBefore() {
            LocalDate to = LocalDate.of(2026, 4, 30);

            service.getByCategory(USER_ID, null, to);

            verify(repository).findExpensesByCategory(USER_ID,
                    LocalDate.of(2025, 10, 30).atStartOfDay(),
                    to.atTime(LocalTime.MAX));
        }

        @Test
        @DisplayName("un rango de un solo dia es valido")
        void singleDayRangeIsValid() {
            LocalDate day = LocalDate.of(2026, 7, 4);

            service.getByCategory(USER_ID, day, day);

            verify(repository).findExpensesByCategory(USER_ID, day.atStartOfDay(), day.atTime(LocalTime.MAX));
        }

        @Test
        @DisplayName("from posterior a to se rechaza sin tocar el repositorio")
        void rejectsInvertedRange() {
            assertThatThrownBy(() -> service.getBalance(USER_ID,
                    LocalDate.of(2026, 5, 2), LocalDate.of(2026, 5, 1)))
                    .isInstanceOf(InvalidDateRangeException.class)
                    .hasMessageContaining("2026-05-02")
                    .hasMessageContaining("2026-05-01");

            verifyNoInteractions(repository);
        }

        @Test
        @DisplayName("el rechazo tambien aplica a cashFlow y category")
        void rejectsInvertedRangeOnEveryReport() {
            LocalDate from = LocalDate.of(2026, 5, 2);
            LocalDate to = LocalDate.of(2026, 5, 1);

            assertThatThrownBy(() -> service.getByCategory(USER_ID, from, to))
                    .isInstanceOf(InvalidDateRangeException.class);
            assertThatThrownBy(() -> service.getCashFlow(USER_ID, from, to))
                    .isInstanceOf(InvalidDateRangeException.class);

            verifyNoInteractions(repository);
        }
    }

    @Nested
    @DisplayName("getBalance")
    class Balance {

        @Test
        @DisplayName("el balance es la resta de los totales del rango")
        void subtractsTotals() {
            when(repository.totalIncomes(eq(USER_ID), any(), any())).thenReturn(new BigDecimal("1500.00"));
            when(repository.totalExpenses(eq(USER_ID), any(), any())).thenReturn(new BigDecimal("900.50"));

            BalanceResponse response = service.getBalance(USER_ID, null, null);

            assertThat(response.getIncomes()).isEqualByComparingTo("1500.00");
            assertThat(response.getExpenses()).isEqualByComparingTo("900.50");
            assertThat(response.getBalance()).isEqualByComparingTo("599.50");
        }
    }

    /**
     * El balance acumulado lo calcula ahora la funcion de ventana de findCashFlow, asi que aqui
     * no se puede verificar la acumulacion: con un mock solo se comprobaria que se devuelve lo
     * que el propio test ha inventado. Lo que si es del servicio es el rango que le pasa.
     */
    @Nested
    @DisplayName("getCashFlow")
    class CashFlow {

        @Test
        @DisplayName("consulta el rango resuelto y devuelve la serie tal cual")
        void delegatesTheResolvedRange() {
            LocalDate from = LocalDate.of(2026, 3, 1);
            LocalDate to = LocalDate.of(2026, 3, 31);
            List<CashFlowResponse> serie = List.of(
                    new CashFlowResponse(LocalDateTime.of(2026, 3, 1, 9, 0), new BigDecimal("100.00")),
                    new CashFlowResponse(LocalDateTime.of(2026, 3, 5, 9, 0), new BigDecimal("70.00")));

            when(repository.findCashFlow(USER_ID, from.atStartOfDay(), to.atTime(LocalTime.MAX)))
                    .thenReturn(serie);

            assertThat(service.getCashFlow(USER_ID, from, to)).isEqualTo(serie);
        }

        @Test
        @DisplayName("sin from ni to consulta los ultimos 6 meses")
        void appliesTheDefaultRange() {
            when(repository.findCashFlow(eq(USER_ID), any(), any())).thenReturn(List.of());

            assertThat(service.getCashFlow(USER_ID, null, null)).isEmpty();

            verify(repository).findCashFlow(USER_ID, DEFAULT_START, DEFAULT_END);
        }
    }
}
