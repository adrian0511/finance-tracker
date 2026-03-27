package com.adrian.financetracker_monolith_api.service.impl;

import com.adrian.financetracker_monolith_api.dto.report.BalanceResponse;
import com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse;
import com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse;
import com.adrian.financetracker_monolith_api.dto.report.MonthlyReportResponse;
import com.adrian.financetracker_monolith_api.entity.Transaction;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.service.interf.ReportService;
import com.adrian.financetracker_monolith_api.util.Type;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final TransactionRepository repository;

    @Override
    public BalanceResponse getBalance(UUID userId) {
        BigDecimal incomes = repository.totalIncomes(userId);
        BigDecimal expenses = repository.totalExpenses(userId);
        BigDecimal balance = incomes.subtract(expenses);

        return new BalanceResponse(incomes, expenses, balance);
    }

    @Override
    public List<CategoryReportResponse> getByCategory(UUID userId) {
        return repository.findByCategory(userId);
    }

    @Override
    public List<MonthlyReportResponse> getByMonthly(UUID userId, int year) {
        return repository.findByMonthly(userId, year);
    }

    @Override
    public List<CashFlowResponse> getCashFlow(UUID userId) {
        List<Transaction> txs = repository.findTransactionsByOrderDate(userId);
        BigDecimal balance = BigDecimal.ZERO;
        List<CashFlowResponse> cashFlow = new ArrayList<>();

        for (Transaction t : txs) {
            if (t.getType() == Type.INCOME) {
                balance = balance.add(t.getAmount());
            } else {
                balance = balance.subtract(t.getAmount());
            }

            cashFlow.add(new CashFlowResponse(t.getDate(), balance));
        }

        return cashFlow;
    }
}
