package com.adrian.financetracker_monolith_api.service.interf;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.adrian.financetracker_monolith_api.dto.account.AccountRequest;
import com.adrian.financetracker_monolith_api.dto.account.AccountResponse;
import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;
import org.springframework.security.core.Authentication;

public interface AccountService {

    AccountResponse createAccount(AccountRequest request, UUID userId);

    AccountResponse getById(UUID id);

    List<AccountResponse> getByUser(UUID userId);

    void delete(UUID id);

    void increaseBalance(BigDecimal amount, UUID accountId);

    void decreaseBalance(BigDecimal amount, UUID accountId);

}
