package com.adrian.financetracker_monolith_api.service.interf;

import java.util.List;
import java.util.UUID;

import com.adrian.financetracker_monolith_api.dto.user.UserRequest;
import com.adrian.financetracker_monolith_api.dto.user.UserResponse;

public interface UserService {

    UserResponse getById(UUID id);

    List<UserResponse> getAllUsers();

    void delete(UUID id);

    UserResponse update(UUID id, UserRequest request);

}
