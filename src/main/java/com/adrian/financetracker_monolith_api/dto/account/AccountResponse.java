package com.adrian.financetracker_monolith_api.dto.account;

import java.math.BigDecimal;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountResponse {

    private UUID id;
    private BigDecimal balance;
    private String name;
    private UUID userId;
}
