package com.adrian.financetracker_monolith_api.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adrian.financetracker_monolith_api.dto.transaction.TransactionRequest;
import com.adrian.financetracker_monolith_api.dto.transaction.TransactionResponse;
import com.adrian.financetracker_monolith_api.entity.Account;
import com.adrian.financetracker_monolith_api.entity.Transaction;
import com.adrian.financetracker_monolith_api.exception.account.AccountNotFoundException;
import com.adrian.financetracker_monolith_api.exception.transaction.TransactionNotFoundException;
import com.adrian.financetracker_monolith_api.mapper.TransactionMapper;
import com.adrian.financetracker_monolith_api.repository.AccountRepository;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.service.interf.AccountService;
import com.adrian.financetracker_monolith_api.service.interf.TransactionService;
import com.adrian.financetracker_monolith_api.util.Type;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository repository;
    private final TransactionMapper mapper;
    private final AccountService accountService;
    private final AccountRepository accountRepository;

    @Override
    @Transactional
    public TransactionResponse createTransaction(TransactionRequest request) {

        Account account = accountRepository.findById(request.getAccountId()).orElseThrow(
                () -> new AccountNotFoundException("Account not found with id: " + request.getAccountId()));

        Transaction transaction = Transaction.builder()
                .account(account)
                .amount(request.getAmount())
                .date(LocalDateTime.now())
                .category(request.getCategory())
                .type(request.getType())
                .build();

        if (transaction.getType().equals(Type.INCOME)) {
            accountService.increaseBalance(transaction.getAmount().doubleValue(), request.getAccountId());
        } else {
            accountService.decreaseBalance(transaction.getAmount().doubleValue(), request.getAccountId());
        }

        return mapper.toResponse(repository.save(transaction));
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getById(UUID id) {
        return repository.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> new TransactionNotFoundException("Transaction not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getByUser(UUID userId) {
        return repository.findByAccountUserId(userId).stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getByAccount(UUID accountId) {
        return repository.findByAccountId(accountId).stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public void delete(UUID id) {
        if (!repository.existsById(id))
            throw new TransactionNotFoundException("Transaction not found with id: " + id);

        repository.deleteById(id);
    }

}
