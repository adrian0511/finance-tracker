package com.adrian.financetracker_monolith_api.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.adrian.financetracker_monolith_api.entity.Account;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {

    List<Account> findByUserId(UUID userId);

    boolean existsByIdAndUserId(UUID id, UUID userId);

    /** SUM ignora los nulls, y COALESCE cubre el caso de un usuario sin cuentas. */
    @Query("""
                SELECT COALESCE(SUM(a.balance),0)
                FROM Account a
                WHERE a.user.id = :userId
            """)
    BigDecimal totalBalance(@Param("userId") UUID userId);

}
