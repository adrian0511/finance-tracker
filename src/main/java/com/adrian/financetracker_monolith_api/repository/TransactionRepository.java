package com.adrian.financetracker_monolith_api.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.adrian.financetracker_monolith_api.entity.Transaction;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByAccountUserId(UUID userId);

    List<Transaction> findByAccountId(UUID accountId);

}
