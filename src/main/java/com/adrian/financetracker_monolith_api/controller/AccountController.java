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

import com.adrian.financetracker_monolith_api.dto.account.AccountRequest;
import com.adrian.financetracker_monolith_api.dto.account.AccountResponse;
import com.adrian.financetracker_monolith_api.service.interf.AccountService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService service;

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(@RequestBody @Valid AccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createAccount(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccountById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<List<AccountResponse>> getAccountByUser(@PathVariable("id") UUID userId) {
        return ResponseEntity.ok(service.getByUser(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable UUID id) {
        service.delete(id);

        return ResponseEntity.noContent().build();
    }

}
