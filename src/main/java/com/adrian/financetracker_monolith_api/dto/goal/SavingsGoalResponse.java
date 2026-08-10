package com.adrian.financetracker_monolith_api.dto.goal;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavingsGoalResponse {

    private UUID id;
    private String name;
    private BigDecimal targetAmount;
    private LocalDate targetDate;
    private LocalDateTime createdAt;
    private UUID userId;
}
