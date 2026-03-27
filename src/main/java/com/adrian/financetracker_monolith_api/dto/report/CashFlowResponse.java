package com.adrian.financetracker_monolith_api.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CashFlowResponse {
    private LocalDateTime date;
    private BigDecimal balance;
}
