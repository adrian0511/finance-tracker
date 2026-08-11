package com.adrian.financetracker_monolith_api.service.impl;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.adrian.financetracker_monolith_api.dto.goal.MonthlyNet;
import com.adrian.financetracker_monolith_api.dto.goal.ProjectionPoint;
import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalRequest;
import com.adrian.financetracker_monolith_api.dto.goal.SavingsGoalResponse;
import com.adrian.financetracker_monolith_api.dto.goal.SavingsProjectionResponse;
import com.adrian.financetracker_monolith_api.entity.SavingsGoal;
import com.adrian.financetracker_monolith_api.entity.User;
import com.adrian.financetracker_monolith_api.exception.goal.SavingsGoalNotFoundException;
import com.adrian.financetracker_monolith_api.exception.user.UserNotFoundException;
import com.adrian.financetracker_monolith_api.mapper.SavingsGoalMapper;
import com.adrian.financetracker_monolith_api.repository.AccountRepository;
import com.adrian.financetracker_monolith_api.repository.SavingsGoalRepository;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.service.interf.SavingsGoalService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SavingsGoalServiceImpl implements SavingsGoalService {

    /** Meses cerrados que se miran hacia atras para estimar el ritmo de ahorro. */
    private static final int HISTORY_MONTHS = 6;

    /** Puntos de la serie que se devuelve para el grafico. */
    private static final int BREAKDOWN_MONTHS = 24;

    /**
     * Techo de la proyeccion. Con un ritmo muy pequeno los meses hasta la meta se disparan y
     * YearMonth.plusMonths acabaria desbordando; mas alla de esto la estimacion no dice nada util.
     */
    private static final int MAX_PROJECTION_MONTHS = 1200;

    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    private static final MathContext MC = new MathContext(20, RoundingMode.HALF_UP);

    private final SavingsGoalRepository repository;
    private final SavingsGoalMapper mapper;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final Clock clock;

    @Override
    @Transactional
    public SavingsGoalResponse create(SavingsGoalRequest request, UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + userId));

        SavingsGoal goal = SavingsGoal.builder()
                .user(user)
                .name(request.getName())
                .targetAmount(request.getTargetAmount())
                .targetDate(request.getTargetDate())
                .createdAt(LocalDateTime.now(clock))
                .build();

        return mapper.toResponse(repository.save(goal));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavingsGoalResponse> getByUser(UUID userId) {
        return repository.findByUserId(userId).stream()
                .map(mapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id, UUID userId) {
        // existsByIdAndUserId en vez de existsById: si la meta es de otro usuario responde 404
        // igual que si no existiera, sin revelar que ese UUID pertenece a alguien.
        if (!repository.existsByIdAndUserId(id, userId))
            throw new SavingsGoalNotFoundException("Savings goal not found with id: " + id);

        repository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public SavingsProjectionResponse project(UUID goalId, UUID userId) {

        // findByIdAndUserId valida ownership dentro de la propia query: una meta ajena responde
        // 404, igual que delete, sin revelar que ese UUID existe.
        SavingsGoal goal = repository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new SavingsGoalNotFoundException("Savings goal not found with id: " + goalId));

        BigDecimal currentBalance = currentBalance(userId);
        List<BigDecimal> monthlyNets = monthlyNets(userId);

        BigDecimal average = average(monthlyNets);
        BigDecimal deviation = standardDeviation(monthlyNets, average);

        BigDecimal remaining = goal.getTargetAmount().subtract(currentBalance).max(BigDecimal.ZERO);

        BigDecimal optimisticRate = average.add(deviation);
        BigDecimal pessimisticRate = average.subtract(deviation);

        YearMonth realisticEta = eta(remaining, average);

        Boolean onTrack = null;
        BigDecimal additionalNeeded = null;
        if (goal.getTargetDate() != null) {
            YearMonth targetMonth = YearMonth.from(goal.getTargetDate());
            onTrack = realisticEta != null && !realisticEta.isAfter(targetMonth);

            if (!onTrack) {
                additionalNeeded = additionalMonthlySavingsNeeded(remaining, average, targetMonth);
            }
        }

        return new SavingsProjectionResponse(
                goal.getId(),
                goal.getName(),
                goal.getTargetAmount(),
                goal.getTargetDate(),
                currentBalance,
                remaining,
                average,
                deviation,
                eta(remaining, optimisticRate),
                realisticEta,
                eta(remaining, pessimisticRate),
                onTrack,
                additionalNeeded,
                breakdown(currentBalance, optimisticRate, average, pessimisticRate));
    }

    /** El ahorro acumulado es la suma de los balances de todas las cuentas del usuario. */
    private BigDecimal currentBalance(UUID userId) {
        return accountRepository.totalBalance(userId);
    }

    /**
     * Neto (ingresos menos gastos) de cada uno de los ultimos meses CERRADOS, del mas antiguo al
     * mas reciente. Se excluye el mes en curso a proposito: al llevar solo unos dias vividos su
     * neto es parcial y hundiria la media, dando una proyeccion peor cuanto antes se consulte.
     * Los meses sin movimientos cuentan como 0, no se omiten: un mes sin ahorrar es informacion.
     */
    private List<BigDecimal> monthlyNets(UUID userId) {
        YearMonth currentMonth = YearMonth.now(clock);
        YearMonth firstMonth = currentMonth.minusMonths(HISTORY_MONTHS);
        YearMonth lastMonth = currentMonth.minusMonths(1);

        LocalDateTime start = firstMonth.atDay(1).atStartOfDay();
        LocalDateTime end = lastMonth.atEndOfMonth().atTime(LocalTime.MAX);

        // La suma por mes la hace la base de datos: aqui solo llegan como mucho HISTORY_MONTHS
        // filas ya agregadas, en vez del historico de movimientos de medio ano.
        Map<YearMonth, BigDecimal> netByMonth = transactionRepository
                .findMonthlyNets(userId, start, end).stream()
                .collect(Collectors.toMap(MonthlyNet::month, MonthlyNet::getNet));

        List<BigDecimal> nets = new ArrayList<>(HISTORY_MONTHS);
        for (int i = HISTORY_MONTHS; i >= 1; i--) {
            nets.add(netByMonth.getOrDefault(currentMonth.minusMonths(i), BigDecimal.ZERO));
        }

        return nets;
    }

    private BigDecimal average(List<BigDecimal> values) {
        return values.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), SCALE, ROUNDING);
    }

    /** Desviacion tipica poblacional: describe los meses observados, no infiere una poblacion mayor. */
    private BigDecimal standardDeviation(List<BigDecimal> values, BigDecimal average) {
        BigDecimal variance = values.stream()
                .map(v -> v.subtract(average).pow(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), MC);

        return variance.sqrt(MC).setScale(SCALE, ROUNDING);
    }

    /** Mes en que se alcanzaria la meta a un ritmo dado, o null si a ese ritmo no se alcanza. */
    private YearMonth eta(BigDecimal remaining, BigDecimal monthlyRate) {
        if (remaining.signum() == 0) {
            return YearMonth.now(clock);
        }
        if (monthlyRate.signum() <= 0) {
            return null;
        }

        BigDecimal months = remaining.divide(monthlyRate, 0, RoundingMode.CEILING);
        if (months.compareTo(BigDecimal.valueOf(MAX_PROJECTION_MONTHS)) > 0) {
            return null;
        }

        return YearMonth.now(clock).plusMonths(months.longValue());
    }

    private BigDecimal additionalMonthlySavingsNeeded(BigDecimal remaining, BigDecimal average,
                                                      YearMonth targetMonth) {
        long monthsLeft = ChronoUnit.MONTHS.between(YearMonth.now(clock), targetMonth);

        // La fecha limite es este mes o ya paso: no queda plazo que repartir, hace falta todo ya.
        if (monthsLeft <= 0) {
            return remaining;
        }

        BigDecimal required = remaining.divide(BigDecimal.valueOf(monthsLeft), SCALE, ROUNDING);

        return required.subtract(average).max(BigDecimal.ZERO);
    }

    private List<ProjectionPoint> breakdown(BigDecimal currentBalance, BigDecimal optimisticRate,
                                            BigDecimal realisticRate, BigDecimal pessimisticRate) {
        YearMonth start = YearMonth.now(clock);
        List<ProjectionPoint> points = new ArrayList<>(BREAKDOWN_MONTHS);

        for (int i = 1; i <= BREAKDOWN_MONTHS; i++) {
            BigDecimal elapsed = BigDecimal.valueOf(i);

            points.add(new ProjectionPoint(
                    start.plusMonths(i),
                    projected(currentBalance, optimisticRate, elapsed),
                    projected(currentBalance, realisticRate, elapsed),
                    projected(currentBalance, pessimisticRate, elapsed)));
        }

        return points;
    }

    private BigDecimal projected(BigDecimal currentBalance, BigDecimal monthlyRate, BigDecimal elapsed) {
        return currentBalance.add(monthlyRate.multiply(elapsed)).setScale(SCALE, ROUNDING);
    }

}
