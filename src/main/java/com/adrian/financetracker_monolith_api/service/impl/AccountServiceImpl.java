package com.adrian.financetracker_monolith_api.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.adrian.financetracker_monolith_api.entity.User;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adrian.financetracker_monolith_api.dto.account.AccountRequest;
import com.adrian.financetracker_monolith_api.dto.account.AccountResponse;
import com.adrian.financetracker_monolith_api.entity.Account;
import com.adrian.financetracker_monolith_api.exception.account.AccountNotFoundException;
import com.adrian.financetracker_monolith_api.exception.account.InsufficientBalanceException;
import com.adrian.financetracker_monolith_api.mapper.AccountMapper;
import com.adrian.financetracker_monolith_api.repository.AccountRepository;
import com.adrian.financetracker_monolith_api.service.interf.AccountService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository repository;
    private final AccountMapper mapper;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public AccountResponse createAccount(AccountRequest request, UUID userId) {

     User user = userRepository.findById(userId)
             .orElseThrow(()-> new UsernameNotFoundException("User not found with id: "+userId));

        Account account = Account.builder()
                .user(user)
                .name(request.getName())
                .balance(BigDecimal.valueOf(0.0))
                .build();

        return mapper.toResponse(repository.save(account));
    }

    @Override
    @Transactional(readOnly = true)
    public AccountResponse getById(UUID id) {
        return repository.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountResponse> getByUser(UUID userId) {
        return repository.findByUserId(userId).stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id))
            throw new AccountNotFoundException("Account not found with id: " + id);

        repository.deleteById(id);
    }

    @Override
    @Transactional
    public void increaseBalance(Double amount, UUID accountId) {
        Account account = repository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with id: " + accountId));

        double total = amount + account.getBalance().doubleValue();

        account.setBalance(BigDecimal.valueOf(total));

        repository.save(account);
    }

    @Override
    @Transactional
    public void decreaseBalance(Double amount, UUID accountId) {
        Account account = repository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with id: " + accountId));

        double currentBalance = account.getBalance().doubleValue();

        if (currentBalance < amount)
            throw new InsufficientBalanceException("The balance is insufficient to perfom the extraction");

        currentBalance -= amount;

        account.setBalance(BigDecimal.valueOf(currentBalance));

        repository.save(account);
    }

}
