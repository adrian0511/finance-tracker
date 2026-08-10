package com.adrian.financetracker_monolith_api.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalRequest;
import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalResponse;
import com.adrian.financetracker_monolith_api.entity.SavingsGoal;
import com.adrian.financetracker_monolith_api.entity.User;
import com.adrian.financetracker_monolith_api.exception.goal.SavingsGoalNotFoundException;
import com.adrian.financetracker_monolith_api.exception.user.UserNotFoundException;
import com.adrian.financetracker_monolith_api.mapper.SavingsGoalMapper;
import com.adrian.financetracker_monolith_api.repository.SavingsGoalRepository;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.service.interf.SavingsGoalService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SavingsGoalServiceImpl implements SavingsGoalService {

    private final SavingsGoalRepository repository;
    private final SavingsGoalMapper mapper;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public SavingsGoalResponse create(SavingsGoalRequest request, UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + userId));

        SavingsGoal goal = SavingsGoal.builder()
                .user(user)
                .name(request.getName())
                .targetAmount(request.getTargetAmount())
                .targetDate(request.getTargetDate())
                .createdAt(LocalDateTime.now())
                .build();

        return mapper.toResponse(repository.save(goal));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavingsGoalResponse> getByUser(UUID userId) {
        return repository.findByUserId(userId).stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id, UUID userId) {
        // existsByIdAndUserId en vez de existsById: si la meta es de otro usuario responde 404
        // igual que si no existiera, sin revelar que ese UUID pertenece a alguien.
        if (!repository.existsByIdAndUserId(id, userId))
            throw new SavingsGoalNotFoundException("Savings goal not found with id: " + id);

        repository.deleteById(id);
    }

}
