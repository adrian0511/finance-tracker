package com.adrian.financetracker_monolith_api.dto.transaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.adrian.financetracker_monolith_api.util.Type;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TransactionResponse {

    private UUID id;
    private BigDecimal amount;
    private String category;
    private UUID accountId;
    private Type type;
    private LocalDateTime date;

}
