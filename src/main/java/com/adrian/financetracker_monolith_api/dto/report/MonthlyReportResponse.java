package com.adrian.financetracker_monolith_api.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyReportResponse {

    private Integer month;
    private BigDecimal incomes;
    private BigDecimal expenses;
    private BigDecimal balance;
}
