package com.adrian.financetracker_monolith_api.controller;

import com.adrian.financetracker_monolith_api.dto.report.BalanceResponse;
import com.adrian.financetracker_monolith_api.dto.report.CashFlowResponse;
import com.adrian.financetracker_monolith_api.dto.report.CategoryReportResponse;
import com.adrian.financetracker_monolith_api.dto.report.MonthlyReportResponse;
import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;
import com.adrian.financetracker_monolith_api.service.interf.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService service;

    /**
     * from/to en formato ISO (yyyy-MM-dd) y ambos inclusivos. Si faltan, el servicio aplica
     * los ultimos 6 meses hasta hoy.
     */
    @GetMapping("/balance")
    public ResponseEntity<BalanceResponse> getBalance(@AuthenticationPrincipal CustomUserDetails user,
                                                      @RequestParam(required = false)
                                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                      @RequestParam(required = false)
                                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(service.getBalance(user.getId(), from, to));
    }

    @GetMapping("/category")
    public ResponseEntity<List<CategoryReportResponse>> getByCategory(@AuthenticationPrincipal CustomUserDetails user,
                                                                      @RequestParam(required = false)
                                                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                                      @RequestParam(required = false)
                                                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(service.getByCategory(user.getId(), from, to));
    }

    @GetMapping("/monthly")
    public ResponseEntity<List<MonthlyReportResponse>> getByMonthly(@AuthenticationPrincipal CustomUserDetails user,
                                                                    @RequestParam int year) {
        return ResponseEntity.ok(service.getByMonthly(user.getId(), year));
    }

    @GetMapping("/cashFlow")
    public ResponseEntity<List<CashFlowResponse>> getCashFlow(@AuthenticationPrincipal CustomUserDetails user,
                                                              @RequestParam(required = false)
                                                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                              @RequestParam(required = false)
                                                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(service.getCashFlow(user.getId(), from, to));
    }
}
