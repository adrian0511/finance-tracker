package com.adrian.financetracker_monolith_api.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.adrian.financetracker_monolith_api.entity.User;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adrian.financetracker_monolith_api.dto.account.AccountRequest;
import com.adrian.financetracker_monolith_api.dto.account.AccountResponse;
import com.adrian.financetracker_monolith_api.entity.Account;
import com.adrian.financetracker_monolith_api.exception.account.AccountHasTransactionsException;
import com.adrian.financetracker_monolith_api.exception.account.AccountNotFoundException;
import com.adrian.financetracker_monolith_api.exception.account.InsufficientBalanceException;
import com.adrian.financetracker_monolith_api.exception.user.UserNotFoundException;
import com.adrian.financetracker_monolith_api.mapper.AccountMapper;
import com.adrian.financetracker_monolith_api.repository.AccountRepository;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.service.interf.AccountService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository repository;
    private final AccountMapper mapper;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    @Override
    @Transactional
    public AccountResponse createAccount(AccountRequest request, UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + userId));

        Account account = Account.builder()
                .user(user)
                .name(request.getName())
                .balance(BigDecimal.ZERO)
                .build();

        Account saved = repository.save(account);

        log.info("Cuenta {} creada para el usuario {}", saved.getId(), userId);

        return mapper.toResponse(saved);
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

        // Transaction.account_id es NOT NULL y no hay cascada: sin este control el borrado
        // reventaria contra la foreign key y el handler generico lo devolveria como un 500.
        if (transactionRepository.existsByAccountId(id)) {
            log.debug("No se puede borrar la cuenta {}: todavia tiene movimientos", id);
            throw new AccountHasTransactionsException(
                    "The account has transactions and cannot be deleted with id: " + id);
        }

        repository.deleteById(id);

        log.info("Cuenta {} borrada", id);
    }

    @Override
    @Transactional
    public void increaseBalance(BigDecimal amount, UUID accountId) {
        Account account = repository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with id: " + accountId));

        // Saldo antes y despues en la misma linea. Es lo unico que permite reconstruir despues
        // como llego una cuenta al saldo que tiene, y sale barato porque solo se arma si el nivel
        // DEBUG esta activo (logging parametrizado, sin concatenar).
        BigDecimal previous = account.getBalance();
        account.setBalance(previous.add(amount));

        log.debug("Cuenta {}: saldo {} + {} = {}", accountId, previous, amount, account.getBalance());

        repository.save(account);
    }

    @Override
    @Transactional
    public void decreaseBalance(BigDecimal amount, UUID accountId) {
        Account account = repository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with id: " + accountId));

        BigDecimal currentBalance = account.getBalance();

        if (currentBalance.compareTo(amount) < 0) {
            log.debug("Cuenta {}: saldo insuficiente, hay {} y se piden {}", accountId, currentBalance, amount);
            throw new InsufficientBalanceException("The balance is insufficient to perfom the extraction");
        }

        account.setBalance(currentBalance.subtract(amount));

        log.debug("Cuenta {}: saldo {} - {} = {}", accountId, currentBalance, amount, account.getBalance());

        repository.save(account);
    }

}
