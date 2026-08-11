package com.adrian.financetracker_monolith_api.service.impl;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.adrian.financetracker_monolith_api.dto.auth.AuthResponse;
import com.adrian.financetracker_monolith_api.dto.auth.LoginRequest;
import com.adrian.financetracker_monolith_api.exception.auth.InvalidCredentialsException;
import com.adrian.financetracker_monolith_api.dto.user.UserRequest;
import com.adrian.financetracker_monolith_api.dto.user.UserResponse;
import com.adrian.financetracker_monolith_api.entity.User;
import com.adrian.financetracker_monolith_api.mapper.UserMapper;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.security.jwt.JwtService;
import com.adrian.financetracker_monolith_api.service.interf.AuthService;
import com.adrian.financetracker_monolith_api.util.Role;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    /** Mismo texto para usuario inexistente y contrasena incorrecta: si difieren, se enumeran. */
    private static final String INVALID_CREDENTIALS = "Credenciales inválidas";

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper mapper;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Override
    public UserResponse register(UserRequest request) {
        User user = User.builder()
                .email(request.getEmail())
                .name(request.getName())
                .lastName(request.getLastName())
                .role(Role.USER)
                .password(passwordEncoder.encode(request.getPassword()))
                .username(request.getUsername())
                .build();

        return mapper.toResponse(repository.save(user));
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = new UsernamePasswordAuthenticationToken(request.getUsername(),
                request.getPassword());

        try {
            authenticationManager.authenticate(authentication);
        } catch (BadCredentialsException exception) {
            // Un solo mensaje para los dos casos. Se cazan aqui juntos porque el
            // userDetailsService lanza UsernameNotFoundException y DaoAuthenticationProvider ya
            // la ha convertido en este mismo BadCredentialsException. Lo que no se caza son los
            // fallos de infraestructura (InternalAuthenticationServiceException), que tienen que
            // seguir siendo un 500 y no un "credenciales invalidas" que no ayuda a nadie.
            log.debug("Login fallido para el usuario {}: {}", request.getUsername(), exception.getMessage());
            throw new InvalidCredentialsException(INVALID_CREDENTIALS);
        }

        User user = repository.findByUsername(request.getUsername()).get();
        String token = jwtService.generateToken(request.getUsername(), generateClaims(user));

        return new AuthResponse(token);
    }

    private Map<String, Object> generateClaims(User customUser) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", customUser.getRole().name());
        claims.put("userId", customUser.getId());

        return claims;
    }

}
