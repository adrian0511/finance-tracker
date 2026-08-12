package com.adrian.financetracker_monolith_api.service.impl;

import com.adrian.financetracker_monolith_api.dto.report.BalanceResponse;
import com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse;
import com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse;
import com.adrian.financetracker_monolith_api.dto.report.MonthlyReportResponse;
import com.adrian.financetracker_monolith_api.exception.report.InvalidDateRangeException;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.service.interf.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    /** Rango por defecto cuando el cliente no manda from/to. */
    private static final int DEFAULT_RANGE_MONTHS = 6;

    private final TransactionRepository repository;
    private final Clock clock;

    @Override
    public BalanceResponse getBalance(UUID userId, LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to);

        BigDecimal incomes = repository.totalIncomes(userId, range.start(), range.end());
        BigDecimal expenses = repository.totalExpenses(userId, range.start(), range.end());
        BigDecimal balance = incomes.subtract(expenses);

        return new BalanceResponse(incomes, expenses, balance);
    }

    /**
     * Desglose de <strong>gasto</strong> por categoria, de mayor a menor. Usa
     * {@code findExpensesByCategory} y no {@code findByCategory}: esta ultima agrupa ingresos y
     * gastos en el mismo total, asi que una categoria con nomina y compras devolvia la resta de
     * las dos como si fuera lo gastado. El informe se lee siempre como gasto (es lo que pinta el
     * dashboard y lo que resume la IA), asi que la query tiene que filtrar por tipo.
     */
    @Override
    public List<CategoryReportResponse> getByCategory(UUID userId, LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to);

        return repository.findExpensesByCategory(userId, range.start(), range.end());
    }

    @Override
    public List<MonthlyReportResponse> getByMonthly(UUID userId, int year) {
        return repository.findByMonthly(userId, year);
    }

    @Override
    public List<CashFlowResponse> getCashFlow(UUID userId, LocalDate from, LocalDate to) {
        DateRange range = resolveRange(from, to);

        // El acumulado lo calcula la query con una funcion de ventana. Arranca en cero dentro del
        // rango: es el flujo del periodo, no el saldo acumulado desde el primer movimiento.
        return repository.findCashFlow(userId, range.start(), range.end());
    }

    /**
     * Convierte el rango opcional en fechas concretas: ambos limites son inclusivos, asi que
     * el dia final llega hasta LocalTime.MAX (si no, quedarian fuera los movimientos de ese dia
     * con hora distinta de medianoche).
     */
    private DateRange resolveRange(LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now(clock);
        LocalDate start = from != null ? from : end.minusMonths(DEFAULT_RANGE_MONTHS);

        if (start.isAfter(end)) {
            log.debug("Rango invertido: from={} es posterior a to={}", start, end);
            throw new InvalidDateRangeException(
                    "La fecha inicial (%s) no puede ser posterior a la final (%s)".formatted(start, end));
        }

        // Se registra lo que entro y lo que sale. Cuando el cliente no manda fechas, el rango lo
        // decide este metodo (ultimos 6 meses) y el informe respondia sobre un periodo que no
        // aparecia por ningun lado: "esos numeros no son los mios" suele ser esto.
        log.debug("Rango del informe: pedido from={} to={}, aplicado {} .. {}", from, to, start, end);

        return new DateRange(start.atStartOfDay(), end.atTime(LocalTime.MAX));
    }

    private record DateRange(LocalDateTime start, LocalDateTime end) {
    }
}
