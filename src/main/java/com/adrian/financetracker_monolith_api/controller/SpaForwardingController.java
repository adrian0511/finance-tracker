package com.adrian.financetracker_monolith_api.controller;

import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Reenvia las rutas de React Router a index.html: sin esto, refrescar en /goals/123 responde 404.
 * <p>
 * {@code @Controller} y no {@code @RestController}, que el String es un nombre de vista y no un
 * cuerpo. Y el {@code [^\.]*} del ultimo segmento deja fuera lo que lleva extension: los
 * controllers ganan a los recursos estaticos, asi que sin eso este mapeo se comeria los assets.
 */
@Controller
public class SpaForwardingController {

    private static final String API_PREFIX = "/api";

    /** Dos patrones: el primero para /dashboard, el segundo para las anidadas (/goals/123). */
    @GetMapping({"/{path:[^\\.]*}", "/**/{path:[^\\.]*}"})
    public String forward(HttpServletRequest request) throws NoResourceFoundException {
        String path = request.getRequestURI().substring(request.getContextPath().length());

        // Una ruta desconocida bajo /api es un 404 de API, no la pantalla del SPA: sin esto un
        // /api/reprts mal escrito devolveria index.html con 200 a quien espera JSON.
        if (path.equals(API_PREFIX) || path.startsWith(API_PREFIX + "/")) {
            throw new NoResourceFoundException(HttpMethod.GET, "", path);
        }

        return "forward:/index.html";
    }
}
