package com.adrian.financetracker_monolith_api.service.interf;

import com.adrian.financetracker_monolith_api.dto.report.BalanceResponse;
import com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse;
import com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse;
import com.adrian.financetracker_monolith_api.dto.report.MonthlyReportResponse;

import java.util.List;
import java.util.UUID;

public interface ReportService {

    BalanceResponse getBalance(UUID userId);

    List<CategoryReportResponse> getByCategory(UUID userId);

    List<MonthlyReportResponse> getByMonthly(UUID userId, int year);

    List<CashFlowResponse> getCashFlow(UUID userId);
}
