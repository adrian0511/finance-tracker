package com.adrian.financetracker_monolith_api.exception.ai;

/**
 * La llamada al modelo agoto el tope total de tiempo que le da {@code AIServiceImpl}.
 *
 * No la lanza la libreria: sus dos timeouts son de <b>conexion</b> y de <b>inactividad</b>, y este
 * caso no es ninguno de los dos. OpenRouter va mandando bytes de keep-alive mientras el modelo
 * genera, asi que la conexion nunca esta inactiva y el read-timeout no llega a saltar por mucho
 * que tarde. Medido: una llamada tardo 268 segundos con el limite de inactividad en 60.
 */
public class AiTimeoutException extends RuntimeException {

    public AiTimeoutException(String message) {
        super(message);
    }

}
