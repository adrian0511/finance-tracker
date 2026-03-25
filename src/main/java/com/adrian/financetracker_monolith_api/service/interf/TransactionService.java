package com.adrian.financetracker_monolith_api.service.interf;

import java.util.List;
import java.util.UUID;

import com.adrian.financetracker_monolith_api.dto.transaction.TransactionRequest;
import com.adrian.financetracker_monolith_api.dto.transaction.TransactionResponse;

public interface TransactionService {

    TransactionResponse createTransaction(TransactionRequest request);

    TransactionResponse getById(UUID id);

    List<TransactionResponse> getByUser(UUID userId);

    List<TransactionResponse> getByAccount(UUID accountId);

    void delete(UUID id);

}
