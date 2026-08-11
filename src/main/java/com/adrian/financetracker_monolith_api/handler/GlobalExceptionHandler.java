package com.adrian.financetracker_monolith_api.handler;

import com.adrian.financetracker_monolith_api.dto.error.ErrorResponse;
import com.adrian.financetracker_monolith_api.exception.account.AccountHasTransactionsException;
import com.adrian.financetracker_monolith_api.exception.account.AccountNotFoundException;
import com.adrian.financetracker_monolith_api.exception.account.InsufficientBalanceException;
import com.adrian.financetracker_monolith_api.exception.auth.InvalidCredentialsException;
import com.adrian.financetracker_monolith_api.exception.goal.SavingsGoalNotFoundException;
import com.adrian.financetracker_monolith_api.exception.report.InvalidDateRangeException;
import com.adrian.financetracker_monolith_api.exception.transaction.TransactionNotFoundException;
import com.adrian.financetracker_monolith_api.exception.user.UserNotFoundException;
import io.github.adrian0511.prompt_link.exceptions.AiClientException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.Locale;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String DUPLICATE_USERNAME = "Ese nombre de usuario ya existe";
    private static final String DATA_CONFLICT = "Los datos enviados entran en conflicto con los que ya hay guardados";

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFoundException(UserNotFoundException exception,
                                                                     HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.NOT_FOUND.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(AccountNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleAccountNotFoundException(AccountNotFoundException exception,
                                                                        HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.NOT_FOUND.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(TransactionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTransactionNotFoundException(TransactionNotFoundException exception,
                                                                            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.NOT_FOUND.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(SavingsGoalNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSavingsGoalNotFoundException(SavingsGoalNotFoundException exception,
                                                                            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.NOT_FOUND.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientBalanceException(
            InsufficientBalanceException exception,
            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.CONFLICT.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(AccountHasTransactionsException.class)
    public ResponseEntity<ErrorResponse> handleAccountHasTransactionsException(
            AccountHasTransactionsException exception,
            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.CONFLICT.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    /**
     * Sin esto lo cazaba el handler generico y registrarse con un username ya cogido respondia
     * 500. El mensaje se decide mirando la causa: la unica restriccion que puede tocar un
     * usuario hoy es la de username, pero este handler cubre cualquier violacion de integridad
     * (una FK, por ejemplo), y ahi hablar de nombres de usuario seria mentir.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException exception,
            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(isDuplicateUsername(exception) ? DUPLICATE_USERNAME : DATA_CONFLICT)
                .path(request.getRequestURI())
                .status(HttpStatus.CONFLICT.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    private boolean isDuplicateUsername(DataIntegrityViolationException exception) {
        String cause = exception.getMostSpecificCause().getMessage();
        return cause != null && cause.toLowerCase(Locale.ROOT).contains("username");
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentialsException(
            InvalidCredentialsException exception,
            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.UNAUTHORIZED.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(InvalidDateRangeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidDateRangeException(
            InvalidDateRangeException exception,
            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.BAD_REQUEST.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException exception,
            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.FORBIDDEN.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            AuthenticationException exception,
            HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .status(HttpStatus.UNAUTHORIZED.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex,
                                                                   HttpServletRequest request) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .findFirst()
                .orElse("Validation error");

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .message(errorMessage)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(AiClientException.class)
    public ResponseEntity<ErrorResponse> handleAiClientException(AiClientException exception,
                                                                 HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(exception.getStatusCode())
                .message(exception.getMessage())
                .path(request.getRequestURI())
                .build();

        HttpStatus status = exception.getStatusCode() == -1 ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.valueOf(exception.getStatusCode());

        return ResponseEntity.status(status).body(error);
    }

    /**
     * Sin esto lo caza el handler generico de abajo y un recurso que no existe responde 500.
     * Es la excepcion que lanza Spring cuando ninguna ruta ni ningun estatico casan con la URL,
     * asi que cubre tanto un asset que falta como una ruta desconocida bajo /api.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFoundException(NoResourceFoundException exception,
                                                                        HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .message("No handler found for " + request.getRequestURI())
                .path(request.getRequestURI())
                .status(HttpStatus.NOT_FOUND.value())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex,
                                                                HttpServletRequest request) {
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .message("An unexpected error occurred")
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

}
