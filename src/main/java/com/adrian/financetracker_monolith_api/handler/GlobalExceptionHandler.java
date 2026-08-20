package com.adrian.financetracker_monolith_api.handler;

import com.adrian.financetracker_monolith_api.dto.error.ErrorResponse;
import com.adrian.financetracker_monolith_api.exception.account.AccountHasTransactionsException;
import com.adrian.financetracker_monolith_api.exception.ai.AiTimeoutException;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import lombok.extern.slf4j.Slf4j;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

/**
 * Niveles: ERROR solo para lo que nadie previo, WARN para el fallo controlado que delata un
 * problema, DEBUG para el detalle. Los errores de cliente (404, 400, 403) van a DEBUG: son
 * funcionamiento normal y en WARN taparian los avisos que si importan.
 *
 * Aqui no se registra nunca una contrasena, un token, un importe ni lo que el usuario le escribe
 * al modelo.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String DUPLICATE_USERNAME = "Ese nombre de usuario ya existe";
    private static final String DATA_CONFLICT = "Los datos enviados entran en conflicto con los que ya hay guardados";
    // Con tildes, que estos dos se le ensenan al usuario tal cual.
    private static final String AI_UNAVAILABLE =
            "El asistente no está disponible en este momento. Inténtalo de nuevo en unos minutos.";
    private static final String AI_RATE_LIMITED = "El asistente ha llegado a su límite de peticiones";

    /**
     * El de <b>Jackson 3</b> ({@code tools.jackson}), que es el que autoconfigura Spring Boot 4.
     * El {@code ObjectMapper} de Jackson 2 esta en el classpath como transitiva, pero no hay bean
     * de ese tipo y pedirlo deja la aplicacion sin arrancar.
     */
    private final ObjectMapper objectMapper;

    public GlobalExceptionHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

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
     * Sin esto lo cazaba el generico y un username repetido respondia 500. El mensaje mira la
     * causa: el handler cubre cualquier violacion de integridad (una FK, por ejemplo), y ahi
     * hablar de nombres de usuario seria mentir.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException exception,
            HttpServletRequest request) {
        // WARN porque una violacion que no sea el username repetido delata algo del modelo.
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

    /** DEBUG: un 403 es {@code @PreAuthorize} haciendo su trabajo, no un problema. */
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
        // El tipo ademas del mensaje: separa un token caducado de un fallo de infraestructura.
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

        // Nunca el valor enviado: por aqui pasan los cuerpos de registro, con contrasenas.
        log.debug("Cuerpo invalido en {} {}: {}", request.getMethod(), request.getRequestURI(), errorMessage);

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .message(errorMessage)
                .path(request.getRequestURI())
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    /**
     * El estado de OpenRouter no se propaga: 503, o 429 si es cuota.
     *
     * {@code getStatusCode()} no es un estado HTTP — es negativo cuando el fallo ocurrio sin
     * respuesta (-1 red, -2 respuesta vacia, -3 configuracion, -4 corte de stream), y pasarselo a
     * {@code HttpStatus.valueOf} lanzaba dentro del propio handler: la peticion acababa en 200.
     * Reenviar los estados reales tampoco vale: un 401 suyo es nuestra API key, y el cliente lo
     * lee como "se acabo la sesion" y desloguea al usuario.
     */
    @ExceptionHandler(AiClientException.class)
    public ResponseEntity<ErrorResponse> handleAiClientException(AiClientException exception,
                                                                 HttpServletRequest request) {
        // El cuerpo va al log y no a la respuesta: puede delatar detalles de la cuenta.
        log.warn("La API de IA fallo en {} (estado {}): {} | cuerpo: {}", request.getRequestURI(),
                exception.getStatusCode(), exception.getMessage(), exception.getErrorBody());

        if (exception.getStatusCode() != HttpStatus.TOO_MANY_REQUESTS.value()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(aiError(HttpStatus.SERVICE_UNAVAILABLE, AI_UNAVAILABLE, request));
        }

        Optional<Long> retryAfter = retryAfterSeconds(exception);

        String message = retryAfter
                .map(seconds -> "%s. Vuelve a intentarlo en %d segundos.".formatted(AI_RATE_LIMITED, seconds))
                .orElse(AI_RATE_LIMITED + ". Vuelve a intentarlo en unos minutos.");

        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS);
        retryAfter.ifPresent(seconds -> response.header(HttpHeaders.RETRY_AFTER, String.valueOf(seconds)));

        return response.body(aiError(HttpStatus.TOO_MANY_REQUESTS, message, request));
    }

    /**
     * Los segundos de espera de {@code error.metadata.retry_after_seconds} en el cuerpo del 429.
     *
     * Ese cuerpo lo escribe un tercero y no hay contrato: cualquier fallo al leerlo se traga y se
     * responde igual sin el dato.
     */
    private Optional<Long> retryAfterSeconds(AiClientException exception) {
        String body = exception.getErrorBody();

        if (body == null || body.isBlank()) {
            return Optional.empty();
        }

        try {
            long seconds = objectMapper.readTree(body)
                    .path("error").path("metadata").path("retry_after_seconds")
                    .asLong(0);

            return seconds > 0 ? Optional.of(seconds) : Optional.empty();
        } catch (JacksonException e) {
            log.debug("El cuerpo del 429 de la IA no se pudo leer como JSON, se responde sin los segundos");
            return Optional.empty();
        }
    }

    /**
     * El tope total de {@code AIServiceImpl}: la llamada seguia viva pasado el limite. Es 503 por
     * lo mismo que el resto de fallos de IA, y con el mismo mensaje: para quien mira la pantalla,
     * "ha tardado demasiado" y "no ha contestado" son la misma cosa y se arreglan igual.
     */
    @ExceptionHandler(AiTimeoutException.class)
    public ResponseEntity<ErrorResponse> handleAiTimeoutException(AiTimeoutException exception,
                                                                   HttpServletRequest request) {
        log.warn("La IA tardo demasiado en {}: {}", request.getRequestURI(), exception.getMessage());

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(aiError(HttpStatus.SERVICE_UNAVAILABLE, AI_UNAVAILABLE, request));
    }

    /**
     * El detalle de por que fallo la IA se queda en el log: el usuario no puede hacer nada distinto
     * segun sea la clave, el credito o un timeout, y el cuerpo de OpenRouter puede llevar datos de
     * la cuenta. La unica excepcion es la cuota, donde si hay algo accionable — cuanto falta.
     *
     * El campo {@code status} lleva el estado que se devuelve de verdad; antes llevaba el -1/-2 de
     * la libreria, que no es un estado HTTP y no significaba nada para el cliente.
     */
    private ErrorResponse aiError(HttpStatus status, String message, HttpServletRequest request) {
        return ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .message(message)
                .path(request.getRequestURI())
                .build();
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
