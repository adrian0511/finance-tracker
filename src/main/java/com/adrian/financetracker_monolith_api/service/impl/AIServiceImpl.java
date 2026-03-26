package com.adrian.financetracker_monolith_api.service.impl;


import com.adrian.financetracker_monolith_api.dto.ai.AIResponse;
import com.adrian.financetracker_monolith_api.entity.Transaction;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.service.interf.AIService;
import com.adrian.financetracker_monolith_api.util.Type;
import io.github.adrian0511.prompt_link.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AIServiceImpl implements AIService {

    private final AiService aiService;
    private final TransactionRepository repository;

    @Override
    public AIResponse generateAnalysis(UUID userId) {
        List<Transaction> txs = repository.findByAccountUserId(userId).stream()
                .limit(50)
                .toList();

        String data = txs.stream()
                .map(t -> t.getType() + "-" + t.getAmount() + "-" + t.getCategory())
                .collect(Collectors.joining("\n"));
        String prompt = """
                Eres un asesor financiero experto.
                
                Analiza estos movimientos:
                %s
                
                Responde con:
                1. Resumen
                2. Problemas detectados
                3. Recomendaciones
                4. Nivel de salud financiero (0-100)
                """.formatted(data);

        return new AIResponse(
                aiService.generate(prompt).getContent(),
                LocalDateTime.now()
        );
    }

    @Override
    public AIResponse generateReport(UUID userId) {

        YearMonth month = YearMonth.now();

        LocalDateTime start = month.atDay(1).atStartOfDay();
        LocalDateTime end = month.atEndOfMonth().atTime(LocalTime.MAX);

        List<Transaction> txs = repository.findByUserAndDateBetween(userId, start, end);

        double incomes = txs.stream()
                .filter(t -> t.getType() == Type.INCOME)
                .mapToDouble(t -> t.getAmount().doubleValue())
                .sum();

        System.out.println(incomes);

        double expenses = txs.stream()
                .filter(t -> t.getType() == Type.EXPENSE)
                .mapToDouble(t -> t.getAmount().doubleValue())
                .sum();

        String prompt = """
                Analiza estos datos financieros del mes actual:
                
                Ingresos: %.2f
                Gastos: %.2f
                
                Dame:
                - Resumen
                - Problemas
                - Recomendaciones
                """.formatted(incomes, expenses);

        return new AIResponse(
                aiService.generate(prompt).getContent(),
                LocalDateTime.now()
        );
    }

    @Override
    public AIResponse categorizeExpenses(String description) {
        String prompt = """
                Clasifica este gasto en una categoria:
                
                Opciones: Comida, Transporte, Entretenimiento, Salud, y cualquier otro que consideres necesario.
                
                Gasto: %s
                
                Response SOLO con la categoria
                """.formatted(description);

        return new AIResponse(
                aiService.generate(prompt).getContent(),
                LocalDateTime.now()
        );
    }

    @Override
    public AIResponse chat(String message) {

        String prompt = """
                Eres un asesor financiero.
                
                Responde de forma clara, breve y útil.
                
                Usuario: %s
                """.formatted(message);

        return new AIResponse(
                aiService.generate(prompt).getContent(),
                LocalDateTime.now()
        );
    }
}
