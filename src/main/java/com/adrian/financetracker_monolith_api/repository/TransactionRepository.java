package com.adrian.financetracker_monolith_api.repository;

import com.adrian.financetracker_monolith_api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByAccountUserId(UUID userId);

    List<Transaction> findByAccountId(UUID accountId);

    @Query("""
            SELECT t FROM Transaction t
            JOIN t.account c
            WHERE c.user.id = :userid
            AND t.date BETWEEN :start AND :end
            """)
    List<Transaction> findByUserAndDateBetween(@Param("userid") UUID userId,
                                               @Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end);

}
