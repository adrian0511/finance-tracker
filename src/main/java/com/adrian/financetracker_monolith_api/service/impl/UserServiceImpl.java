package com.adrian.financetracker_monolith_api.service.impl;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adrian.financetracker_monolith_api.dto.user.UserRequest;
import com.adrian.financetracker_monolith_api.dto.user.UserResponse;
import com.adrian.financetracker_monolith_api.exception.user.UserNotFoundException;
import com.adrian.financetracker_monolith_api.mapper.UserMapper;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.service.interf.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository repository;
    private final UserMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        return repository.findById(id)
                .map(mapper::toResponse)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return repository.findAll().stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id))
            throw new UserNotFoundException("User not found with id: " + id);

        repository.deleteById(id);

        // Solo lo puede hacer un ADMIN y se lleva por delante a una persona entera: es de las
        // pocas operaciones del backend que conviene poder rastrear despues.
        log.info("Usuario {} borrado", id);
    }

    @Override
    @Transactional
    public UserResponse update(UUID id, UserRequest request) {
        return mapper.toResponse(
                repository.findById(id).map(u -> {
                    u.setEmail(request.getEmail());
                    u.setName(request.getName());
                    u.setLastName(request.getLastName());

                    // Que campos se tocaron, no con que valores: aqui van el email y el nombre
                    // real de una persona, y no tienen por que acabar en un fichero de log.
                    log.info("Usuario {} actualizado (email, nombre y apellidos)", id);

                    return repository.save(u);
                })
                        .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id)));
    }

}
