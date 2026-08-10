package com.adrian.financetracker_monolith_api.dto.goal;

import java.math.BigDecimal;
import java.time.YearMonth;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un punto de la serie mensual que el frontend pinta como grafico. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectionPoint {

    @JsonFormat(pattern = "yyyy-MM")
    private YearMonth month;

    private BigDecimal optimisticBalance;
    private BigDecimal realisticBalance;
    private BigDecimal pessimisticBalance;
}
