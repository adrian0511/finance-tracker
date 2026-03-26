package com.adrian.financetracker_monolith_api.controller;

import com.adrian.financetracker_monolith_api.dto.ai.AIResponse;
import com.adrian.financetracker_monolith_api.dto.ai.CategorizeRequest;
import com.adrian.financetracker_monolith_api.dto.ai.ChatRequest;
import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;
import com.adrian.financetracker_monolith_api.service.interf.AIService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;

    @GetMapping("/analysis")
    public ResponseEntity<AIResponse> analysis(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(aiService.generateAnalysis(user.getId()));
    }

    @GetMapping("/report")
    public ResponseEntity<AIResponse> report(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(aiService.generateReport(user.getId()));
    }

    @PostMapping("/categorize")
    public ResponseEntity<AIResponse> categorize(@RequestBody @Valid CategorizeRequest request) {
        return ResponseEntity.ok(aiService.categorizeExpenses(request.getDescription()));
    }

    @PostMapping("/chat")
    public ResponseEntity<AIResponse> chat(@RequestBody @Valid ChatRequest request) {
        return ResponseEntity.ok(aiService.chat(request.getMessage()));
    }
}
