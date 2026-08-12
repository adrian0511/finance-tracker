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
import lombok.extern.slf4j.Slf4j;

@Slf4j
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

        // El importe va en DEBUG y no en el INFO de abajo: es un dato financiero y no tiene por
        // que quedar registrado salvo que alguien este diagnosticando algo.
        log.debug("Registrando {} de {} en la cuenta {} (categoria: {})", request.getType(),
                request.getAmount(), request.getAccountId(), request.getCategory());

        if (transaction.getType().equals(Type.INCOME)) {
            accountService.increaseBalance(transaction.getAmount(), request.getAccountId());
        } else {
            accountService.decreaseBalance(transaction.getAmount(), request.getAccountId());
        }

        Transaction saved = repository.save(transaction);

        log.info("Movimiento {} creado en la cuenta {}", saved.getId(), account.getId());

        return mapper.toResponse(saved);
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
        return repository.findByAccountUserIdOrderByDateDesc(userId).stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getByAccount(UUID accountId) {
        return repository.findByAccountIdOrderByDateDesc(accountId).stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Transaction transaction = repository.findById(id)
                .orElseThrow(() -> new TransactionNotFoundException("Transaction not found with id: " + id));

        UUID accountId = transaction.getAccount().getId();

        // Este es el log que de verdad hacia falta: el borrado revierte el efecto sobre el saldo
        // (invariante 1), y esa reversion era invisible. Si un saldo acaba descuadrado, esta
        // linea es la que dice si el ajuste llego a ejecutarse y en que sentido.
        log.debug("Borrando el movimiento {}: se revierte {} de {} sobre la cuenta {}", id,
                transaction.getType(), transaction.getAmount(), accountId);

        if (transaction.getType().equals(Type.INCOME)) {
            accountService.decreaseBalance(transaction.getAmount(), accountId);
        } else {
            accountService.increaseBalance(transaction.getAmount(), accountId);
        }

        repository.deleteById(id);

        log.info("Movimiento {} borrado de la cuenta {}", id, accountId);
    }

}
