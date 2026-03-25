package com.adrian.financetracker_monolith_api.service.interf;

import java.util.List;
import java.util.UUID;

import com.adrian.financetracker_monolith_api.dto.account.AccountRequest;
import com.adrian.financetracker_monolith_api.dto.account.AccountResponse;

public interface AccountService {

    AccountResponse createAccount(AccountRequest request);

    AccountResponse getById(UUID id);

    List<AccountResponse> getByUser(UUID userId);

    void delete(UUID id);

    void increaseBalance(Double amount, UUID accountId);

    void decreaseBalance(Double amount, UUID accountId);

}
