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
                .balance(BigDecimal.ZERO)
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
    public void increaseBalance(BigDecimal amount, UUID accountId) {
        Account account = repository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with id: " + accountId));

        account.setBalance(account.getBalance().add(amount));

        repository.save(account);
    }

    @Override
    @Transactional
    public void decreaseBalance(BigDecimal amount, UUID accountId) {
        Account account = repository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with id: " + accountId));

        BigDecimal currentBalance = account.getBalance();

        if (currentBalance.compareTo(amount) < 0)
            throw new InsufficientBalanceException("The balance is insufficient to perfom the extraction");

        account.setBalance(currentBalance.subtract(amount));

        repository.save(account);
    }

}
