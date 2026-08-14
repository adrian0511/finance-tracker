package com.adrian.financetracker_monolith_api.exception.ai;

/**
 * La llamada al modelo agoto el tope total de {@code AIServiceImpl}. No la lanza la libreria: sus
 * timeouts son de conexion y de inactividad, y los keep-alive de OpenRouter dejan el segundo sin
 * efecto.
 */
public class AiTimeoutException extends RuntimeException {

    public AiTimeoutException(String message) {
        super(message);
    }

}
