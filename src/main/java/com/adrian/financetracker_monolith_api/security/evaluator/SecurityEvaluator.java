package com.adrian.financetracker_monolith_api.security.evaluator;

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

        // El dueño lo resuelve la query, no se navega la entidad. Esto se evalua antes de que
        // exista la transaccion del servicio, asi que recorrer account -> user aqui dependia de
        // que Open Session In View dejara la sesion abierta durante toda la peticion.
        UUID ownerId = repository.findOwnerId(transactionId)
                .orElseThrow(()-> new TransactionNotFoundException("Transaction not found with id: "+transactionId));

        return ownerId.equals(userId);
    }

    public boolean isAccountOwner(UUID accountId,Authentication authentication){
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        assert userDetails != null;
        UUID userId = userDetails.getId();

        return accountRepository.existsByIdAndUserId(accountId,userId);
    }
}
