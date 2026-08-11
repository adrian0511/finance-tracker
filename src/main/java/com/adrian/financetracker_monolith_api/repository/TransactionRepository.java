package com.adrian.financetracker_monolith_api.repository;

import com.adrian.financetracker_monolith_api.dto.goal.MonthlyNet;
import com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse;
import com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse;
import com.adrian.financetracker_monolith_api.dto.report.MonthlyReportResponse;
import com.adrian.financetracker_monolith_api.entity.Transaction;
import org.springframework.data.domain.Pageable;
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

    /**
     * Balance corriente del periodo: cada fila trae el acumulado hasta ese movimiento, calculado
     * con una funcion de ventana en vez de recorriendo la lista en el servicio.
     * <p>
     * El desempate por {@code t.id} no es decorativo: con dos movimientos en el mismo instante,
     * el marco RANGE por defecto les daria a los dos el acumulado del grupo entero. Al ordenar
     * por (fecha, id) no hay empates posibles y cada fila recibe su acumulado.
     */
    @Query("""
                SELECT new com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse(
                    t.date,
                    SUM(CASE WHEN t.type='INCOME' THEN t.amount ELSE -t.amount END)
                        OVER (ORDER BY t.date, t.id)
                )
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.date BETWEEN :start AND :end
                ORDER BY t.date, t.id
            """)
    List<CashFlowResponse> findCashFlow(@Param("userId") UUID userId,
                                        @Param("start") LocalDateTime start,
                                        @Param("end") LocalDateTime end);

    @Query("""
                SELECT COALESCE(SUM(t.amount),0)
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.type = 'INCOME'
                AND t.date BETWEEN :start AND :end
            """)
    BigDecimal totalIncomes(@Param("userId") UUID userID,
                            @Param("start") LocalDateTime start,
                            @Param("end") LocalDateTime end);

    @Query("""
                SELECT COALESCE(SUM(t.amount),0)
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.type = 'EXPENSE'
                AND t.date BETWEEN :start AND :end
            """)
    BigDecimal totalExpenses(@Param("userId") UUID userID,
                             @Param("start") LocalDateTime start,
                             @Param("end") LocalDateTime end);

    /**
     * Las N mas recientes primero. El limite se pasa como {@link Pageable} ({@code PageRequest.of(0, n)}):
     * asi la base de datos ordena y corta, en vez de traerse el historico entero para descartarlo.
     */
    @Query("SELECT t FROM Transaction t WHERE t.account.user.id = :userId ORDER BY t.date DESC")
    List<Transaction> findRecentTransactions(@Param("userId") UUID userId, Pageable pageable);

    @Query("""
                SELECT COUNT(t)
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.date BETWEEN :start AND :end
            """)
    long countByUserAndDateBetween(@Param("userId") UUID userId,
                                   @Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end);

    @Query("""
                SELECT new com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse(
                    t.category,
                    COALESCE(SUM(t.amount),0)
                )
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.date BETWEEN :start AND :end
                GROUP BY t.category
            """)
    List<CategoryReportResponse> findByCategory(@Param("userId") UUID userId,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

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

    /**
     * Solo gastos, de mayor a menor importe. El ORDER BY va sobre el agregado a proposito: es lo
     * que consume {@code AIServiceImpl.generateReport}, que necesita las categorias mas caras
     * primero. La categoria puede venir a null (es texto libre en la entidad).
     */
    @Query("""
                SELECT new com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse(
                    t.category,
                    COALESCE(SUM(t.amount),0)
                )
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.type = 'EXPENSE'
                AND t.date BETWEEN :start AND :end
                GROUP BY t.category
                ORDER BY SUM(t.amount) DESC
            """)
    List<CategoryReportResponse> findExpensesByCategory(@Param("userId") UUID userId,
                                                        @Param("start") LocalDateTime start,
                                                        @Param("end") LocalDateTime end);

    /**
     * Neto por mes (ingresos menos gastos), del mas antiguo al mas reciente. Devuelve solo los
     * meses con movimientos: los huecos los rellena el servicio, que es quien sabe que rango
     * pidio. Agrupa por YEAR+MONTH, no solo por MONTH, para que un rango a caballo entre dos
     * anos no sume enero de 2025 con enero de 2026.
     */
    @Query("""
                SELECT new com.adrian.financetracker_monolith_api.dto.goal.MonthlyNet(
                    YEAR(t.date),
                    MONTH(t.date),
                    COALESCE(SUM(CASE WHEN t.type='INCOME' THEN t.amount ELSE -t.amount END),0)
                )
                FROM Transaction t
                WHERE t.account.user.id = :userId
                AND t.date BETWEEN :start AND :end
                GROUP BY YEAR(t.date), MONTH(t.date)
                ORDER BY YEAR(t.date), MONTH(t.date)
            """)
    List<MonthlyNet> findMonthlyNets(@Param("userId") UUID userId,
                                     @Param("start") LocalDateTime start,
                                     @Param("end") LocalDateTime end);
}
