package com.adrian.financetracker_monolith_api.dto.goal;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavingsProjectionResponse {

    private UUID goalId;
    private String goalName;
    private BigDecimal targetAmount;
    private LocalDate targetDate;

    /** Suma de los balances de todas las cuentas del usuario. */
    private BigDecimal currentBalance;

    /** Lo que falta para la meta. Cero si ya se alcanzo. */
    private BigDecimal remainingAmount;

    /** Ahorro neto medio de los ultimos meses cerrados (ingresos menos gastos). */
    private BigDecimal averageMonthlyNet;

    /** Cuanto oscila ese neto de un mes a otro. Lo que separa los tres escenarios. */
    private BigDecimal monthlyNetStdDeviation;

    /** Null cuando a ese ritmo la meta no se alcanza (ritmo <= 0 o fuera de horizonte). */
    @JsonFormat(pattern = "yyyy-MM")
    private YearMonth optimisticEta;

    @JsonFormat(pattern = "yyyy-MM")
    private YearMonth realisticEta;

    @JsonFormat(pattern = "yyyy-MM")
    private YearMonth pessimisticEta;

    /** Null si la meta no tiene targetDate. */
    private Boolean onTrackForTargetDate;

    /** Cuanto habria que ahorrar de mas cada mes. Null si va a tiempo o no hay targetDate. */
    private BigDecimal additionalMonthlySavingsNeeded;

    private List<ProjectionPoint> monthlyBreakdown;
}
