package com.adrian.financetracker_monolith_api.repository;

import com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse;
import com.adrian.financetracker_monolith_api.dto.report.MonthlyReportResponse;
import com.adrian.financetracker_monolith_api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByAccountUserId(UUID userId);

    List<Transaction> findByAccountId(UUID accountId);

    boolean existsByAccountId(UUID accountId);

    @Query("""
            SELECT t FROM Transaction t
            JOIN t.account c
            WHERE c.user.id = :userid
            AND t.date BETWEEN :start AND :end
            """)
    List<Transaction> findByUserAndDateBetween(@Param("userid") UUID userId,
                                               @Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end);

    @Query("""
                SELECT COALESCE(SUM(t.amount),0)
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.type = 'INCOME'
            """)
    BigDecimal totalIncomes(@Param("userId") UUID userID);

    @Query("""
                SELECT COALESCE(SUM(t.amount),0)
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.type = 'EXPENSE'
            """)
    BigDecimal totalExpenses(@Param("userId") UUID userID);

    @Query("SELECT t FROM Transaction t WHERE t.account.user.id = :userId ORDER BY t.date")
    List<Transaction> findTransactionsByOrderDate(@Param("userId") UUID userId);

    @Query("""
                SELECT new com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse(
                    t.category,
                    COALESCE(SUM(t.amount),0)
                )
                FROM Transaction t
                WHERE t.account.user.id = :userId
                GROUP BY t.category
            """)
    List<CategoryReportResponse> findByCategory(@Param("userId") UUID userId);

    @Query("""
            SELECT new com.adrian.financetracker_monolith_api.dto.report.MonthlyReportResponse(
                        MONTH(t.date),
                        COALESCE(SUM(CASE WHEN t.type='INCOME' THEN t.amount ELSE 0 END),0),
                        COALESCE(SUM(CASE WHEN t.type='EXPENSE' THEN t.amount ELSE 0 END),0),
                        COALESCE(SUM(CASE WHEN t.type='INCOME' THEN t.amount ELSE -t.amount END),0)
                        )
            FROM Transaction t
            WHERE t.account.user.id = :userId
            AND YEAR(t.date) = :year
            GROUP BY MONTH(t.date)
            ORDER BY MONTH(t.date)
            """)
    List<MonthlyReportResponse> findByMonthly(@Param("userId") UUID userId, @Param("year") int year);
}
