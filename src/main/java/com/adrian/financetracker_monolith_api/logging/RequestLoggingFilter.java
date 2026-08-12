package com.adrian.financetracker_monolith_api.logging;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * Una linea por peticion de API, con su metodo, su ruta, el codigo con el que se respondio y lo
 * que tardo. Y un identificador corto en el MDC, que el patron de {@code application.yaml} imprime
 * en <b>todas</b> las lineas de esa peticion.
 *
 * Ese identificador es lo que hace legible el resto del log: sin el, con dos peticiones a la vez,
 * el ajuste de saldo de una y el de otra aparecen intercalados y no hay forma de saber cual es de
 * cual. Es barato y es lo primero que se echa de menos cuando algo va mal.
 *
 * Solo cubre {@code /api}: el resto son el HTML y los assets del SPA, y una linea por icono no
 * informa de nada. Va el primero de la cadena para que el identificador ya exista cuando escriban
 * el filtro de JWT o el manejador de errores.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID = "requestId";
    private static final String API_PREFIX = "/api";

    /** Ocho caracteres bastan para distinguir peticiones simultaneas y no ensucian la linea. */
    private static final int ID_LENGTH = 8;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(API_PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        MDC.put(REQUEST_ID, UUID.randomUUID().toString().substring(0, ID_LENGTH));
        long startedAt = System.currentTimeMillis();

        try {
            filterChain.doFilter(request, response);
        } finally {
            // En el finally: si la peticion revienta, esa es justo la que hay que ver en el log, y
            // el estado ya lo ha fijado el manejador de errores para cuando se lee aqui.
            log.info("{} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(),
                    response.getStatus(), System.currentTimeMillis() - startedAt);

            // Imprescindible limpiar: el hilo vuelve al pool de Tomcat y se reutiliza para otra
            // peticion, que heredaria este identificador y mezclaria las dos en el log.
            MDC.clear();
        }
    }

}
