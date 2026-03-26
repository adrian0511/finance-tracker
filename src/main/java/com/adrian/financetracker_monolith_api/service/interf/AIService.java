package com.adrian.financetracker_monolith_api.service.interf;

import com.adrian.financetracker_monolith_api.dto.ai.AIResponse;

import java.util.UUID;

public interface AIService {

    AIResponse generateAnalysis(UUID userId);

    AIResponse generateReport(UUID userId);

    AIResponse categorizeExpenses(String description);

    AIResponse chat(String message);

}
