package com.adrian.financetracker_monolith_api.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CategoryReportResponse {
    
    private String category;
    private BigDecimal total;
}
