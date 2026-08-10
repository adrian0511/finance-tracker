package com.adrian.financetracker_monolith_api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalRequest;
import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalResponse;
import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;
import com.adrian.financetracker_monolith_api.service.interf.SavingsGoalService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class SavingsGoalController {

    private final SavingsGoalService service;

    @PostMapping
    public ResponseEntity<SavingsGoalResponse> createGoal(@RequestBody @Valid SavingsGoalRequest request,
                                                          @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request, user.getId()));
    }

    @GetMapping
    public ResponseEntity<List<SavingsGoalResponse>> getGoals(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(service.getByUser(user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable UUID id,
                                           @AuthenticationPrincipal CustomUserDetails user) {
        service.delete(id, user.getId());

        return ResponseEntity.noContent().build();
    }

}
