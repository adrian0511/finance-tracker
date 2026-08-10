package com.adrian.financetracker_monolith_api.service.interf;

import java.util.List;
import java.util.UUID;

import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalRequest;
import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalResponse;

public interface SavingsGoalService {

    SavingsGoalResponse create(SavingsGoalRequest request, UUID userId);

    List<SavingsGoalResponse> getByUser(UUID userId);

    void delete(UUID id, UUID userId);

}
