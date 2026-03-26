package com.adrian.financetracker_monolith_api.security.evaluator;

import com.adrian.financetracker_monolith_api.entity.Transaction;
import com.adrian.financetracker_monolith_api.exception.transaction.TransactionNotFoundException;
import com.adrian.financetracker_monolith_api.repository.AccountRepository;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("securityEvaluator")
@RequiredArgsConstructor
public class SecurityEvaluator {

    private final TransactionRepository repository;
    private final AccountRepository accountRepository;

    public boolean isTransactionOwner(UUID transactionId, Authentication authentication){
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        assert userDetails != null;
        UUID userId = userDetails.getId();

        Transaction transaction = repository.findById(transactionId)
                .orElseThrow(()-> new TransactionNotFoundException("Transaction not found with id: "+transactionId));

        return transaction.getAccount().getUser().getId().equals(userId);
    }

    public boolean isAccountOwner(UUID accountId,Authentication authentication){
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        assert userDetails != null;
        UUID userId = userDetails.getId();

        return accountRepository.existsByIdAndUserId(accountId,userId);
    }
}
