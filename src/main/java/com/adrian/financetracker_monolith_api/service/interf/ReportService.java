package com.adrian.financetracker_monolith_api.service.interf;

import com.adrian.financetracker_monolith_api.dto.report.BalanceResponse;
import com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse;
import com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse;
import com.adrian.financetracker_monolith_api.dto.report.MonthlyReportResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * En los informes con rango, {@code from} y {@code to} son opcionales: si vienen a null se
 * aplica el rango por defecto (los ultimos 6 meses hasta hoy). Ambos limites son inclusivos.
 */
public interface ReportService {

    BalanceResponse getBalance(UUID userId, LocalDate from, LocalDate to);

    List<CategoryReportResponse> getByCategory(UUID userId, LocalDate from, LocalDate to);

    List<MonthlyReportResponse> getByMonthly(UUID userId, int year);

    List<CashFlowResponse> getCashFlow(UUID userId, LocalDate from, LocalDate to);
}
