package com.adrian.financetracker_monolith_api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.adrian.financetracker_monolith_api.dto.transaction.TransactionRequest;
import com.adrian.financetracker_monolith_api.dto.transaction.TransactionResponse;
import com.adrian.financetracker_monolith_api.service.interf.TransactionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService service;

    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(@RequestBody @Valid TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createTransaction(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransactionById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<List<TransactionResponse>> getTransactionByUser(@PathVariable("id") UUID userId) {
        return ResponseEntity.ok(service.getByUser(userId));
    }

    @GetMapping("/accounts/{id}")
    public ResponseEntity<List<TransactionResponse>> getTransactionByAccount(@PathVariable("id") UUID accountId) {
        return ResponseEntity.ok(service.getByAccount(accountId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable UUID id) {
        service.delete(id);

        return ResponseEntity.noContent().build();
    }

}
