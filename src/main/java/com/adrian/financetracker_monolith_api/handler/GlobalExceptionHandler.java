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

import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Politica de niveles, la misma en todo el backend:
 *
 * <ul>
 *   <li><b>ERROR</b>: solo lo que nadie previo, con traza. Si aparece uno, hay un bug.</li>
 *   <li><b>WARN</b>: fallo controlado que aun asi delata un problema (login fallido, la IA
 *       caida, una violacion de integridad).</li>
 *   <li><b>INFO</b>: que ha pasado, <b>sin cifras</b>: alta y baja de recursos, con ids.</li>
 *   <li><b>DEBUG</b>: el detalle, y ahi si van importes, saldos, rangos y tiempos.</li>
 * </ul>
 *
 * La linea entre INFO y DEBUG es deliberada: un log de INFO en produccion no puede ir contando
 * cuanto cobra ni cuanto gasta nadie. Los importes solo salen si alguien sube el nivel a DEBUG
 * para diagnosticar algo. Por lo mismo, aqui no se registra nunca una contrasena, un token ni el
 * texto que el usuario le escribe al modelo.
 *
 * Los errores de cliente (404, 400, 403) van a DEBUG: son parte del funcionamiento normal de una
 * API y en WARN solo servirian para tapar los avisos que si importan.
 */
@Slf4j
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
        // WARN y no DEBUG: un username repetido es rutina, pero cualquier otra violacion de
        // integridad (una FK que salta al borrar) es una señal de que algo del modelo no cuadra.
        // Se registra la causa mas especifica, que es la que dice que restriccion salto.
        log.warn("Violacion de integridad en {} {}: {}", request.getMethod(), request.getRequestURI(),
                exception.getMostSpecificCause().getMessage());

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

    /**
     * DEBUG y no WARN: un 403 significa que {@code @PreAuthorize} ha hecho su trabajo, que es
     * exactamente lo que tiene que pasar cuando alguien pide un recurso ajeno. Lo interesante
     * seria que se repitiera mucho, y para eso ya esta el nivel de diagnostico.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException exception,
            HttpServletRequest request) {
        log.debug("Acceso denegado en {} {}", request.getMethod(), request.getRequestURI());

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
        // Se registra el tipo de excepcion ademas del mensaje: es lo que separa un token
        // caducado de un fallo de infraestructura, que aqui llegan los dos.
        log.warn("Fallo de autenticacion en {}: {} - {}", request.getRequestURI(),
                exception.getClass().getSimpleName(), exception.getMessage());

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

        // Solo el campo y el motivo, nunca el valor que se envio: por aqui pasan los cuerpos de
        // registro, y el valor rechazado podria ser una contrasena que no cumple el minimo.
        log.debug("Cuerpo invalido en {} {}: {}", request.getMethod(), request.getRequestURI(), errorMessage);

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
        // El cuerpo es la parte util: OpenRouter explica ahi si es la clave, el credito o el
        // limite de peticiones, y esos tres se ven igual desde fuera (un 4xx cualquiera). Sin
        // esta linea, "la IA no va" no se puede distinguir de "se acabo la cuota".
        log.warn("La API de IA fallo en {} (estado {}): {} | cuerpo: {}", request.getRequestURI(),
                exception.getStatusCode(), exception.getMessage(), exception.getErrorBody());

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

    /**
     * El unico ERROR del backend, y con traza completa.
     *
     * Es imprescindible que este aqui: al cliente se le responde "An unexpected error occurred"
     * a proposito, para no filtrar el detalle interno. Sin este log, ese detalle no queda en
     * ningun sitio y un 500 en produccion es indiagnosticable — solo se sabe que algo fallo.
     *
     * `ex` va como ultimo argumento y sin `{}`: asi SLF4J lo trata como excepcion e imprime la
     * traza, en vez de meter su toString en el mensaje.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex,
                                                                HttpServletRequest request) {
        log.error("Error no controlado en {} {}", request.getMethod(), request.getRequestURI(), ex);

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .message("An unexpected error occurred")
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

}
