package com.adrian.financetracker_monolith_api.exception.auth;

/**
 * Un unico fallo de login para todos los casos: usuario que no existe y contrasena que no es.
 * Distinguirlos por el mensaje convierte el login en un buscador de usuarios registrados.
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }

}
