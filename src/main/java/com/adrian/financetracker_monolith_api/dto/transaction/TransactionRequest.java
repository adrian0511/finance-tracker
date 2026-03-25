package com.adrian.financetracker_monolith_api.dto.transaction;

import java.math.BigDecimal;
import java.util.UUID;

import com.adrian.financetracker_monolith_api.util.Type;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionRequest {

    @NotNull
    private BigDecimal amount;
    @NotNull
    private Type type;
    @NotNull
    private String category;
    @NotNull
    private UUID accountId;

}
