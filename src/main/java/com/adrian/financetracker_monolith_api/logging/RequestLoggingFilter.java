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
 * Una linea por peticion de API (metodo, ruta, estado y duracion) y un identificador corto en el
 * MDC que el patron de {@code application.yaml} imprime en <b>todas</b> las lineas de esa
 * peticion: sin el, con dos peticiones a la vez el log se intercala y no hay forma de separarlas.
 *
 * Solo cubre {@code /api} — una linea por icono no informa de nada — y va el primero de la cadena
 * para que el identificador ya exista cuando escriban el filtro de JWT o el manejador de errores.
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
            // En el finally: si la peticion revienta, esa es justo la que hay que ver en el log.
            log.info("{} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(),
                    response.getStatus(), System.currentTimeMillis() - startedAt);

            // El hilo vuelve al pool de Tomcat: sin limpiar, la siguiente peticion hereda el id.
            MDC.clear();
        }
    }

}
