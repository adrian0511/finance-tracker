package com.adrian.financetracker_monolith_api.dto.user;

import java.util.UUID;

import javax.management.relation.Role;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;
    private String username;
    private String email;
    private Role role;
    private String name;
    private String lastName;

}
