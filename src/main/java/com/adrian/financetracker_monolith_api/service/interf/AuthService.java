package com.adrian.financetracker_monolith_api.service.interf;

import com.adrian.financetracker_monolith_api.dto.auth.AuthResponse;
import com.adrian.financetracker_monolith_api.dto.auth.LoginRequest;
import com.adrian.financetracker_monolith_api.dto.user.UserRequest;
import com.adrian.financetracker_monolith_api.dto.user.UserResponse;

public interface AuthService {

    UserResponse register(UserRequest request);

    AuthResponse login(LoginRequest request);

}
