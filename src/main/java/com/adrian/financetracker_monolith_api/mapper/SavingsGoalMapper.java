package com.adrian.financetracker_monolith_api.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalResponse;
import com.adrian.financetracker_monolith_api.entity.SavingsGoal;

@Mapper(componentModel = "spring")
public interface SavingsGoalMapper {

    @Mapping(target = "userId", source = "user.id")
    SavingsGoalResponse toResponse(SavingsGoal savingsGoal);

}
