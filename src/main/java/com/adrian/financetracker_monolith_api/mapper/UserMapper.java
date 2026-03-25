package com.adrian.financetracker_monolith_api.mapper;

import org.mapstruct.Mapper;

import com.adrian.financetracker_monolith_api.dto.user.UserResponse;
import com.adrian.financetracker_monolith_api.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(User user);

}
