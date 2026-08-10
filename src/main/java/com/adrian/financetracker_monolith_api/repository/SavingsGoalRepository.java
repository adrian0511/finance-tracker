package com.adrian.financetracker_monolith_api.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.adrian.financetracker_monolith_api.entity.SavingsGoal;

@Repository
public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, UUID> {

    List<SavingsGoal> findByUserId(UUID userId);

    boolean existsByIdAndUserId(UUID id, UUID userId);

    /** Trae la meta y valida ownership en la misma query. */
    Optional<SavingsGoal> findByIdAndUserId(UUID id, UUID userId);

}
