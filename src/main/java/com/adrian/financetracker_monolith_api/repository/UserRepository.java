package com.adrian.financetracker_monolith_api.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.adrian.financetracker_monolith_api.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

}
