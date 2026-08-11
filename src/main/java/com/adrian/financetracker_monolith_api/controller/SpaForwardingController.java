package com.adrian.financetracker_monolith_api.controller;

import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Reenvia las rutas de React Router a index.html. Sin esto, refrescar en /goals/123 responde
 * 404: Spring solo sirve ficheros que existen de verdad en static/, y esa ruta solo existe en
 * el cliente.
 * <p>
 * Es un {@code @Controller}, no un {@code @RestController}: aqui el String que se devuelve es
 * un nombre de vista. En un {@code @RestController} el cuerpo de la respuesta seria el texto
 * literal "forward:/index.html".
 * <p>
 * El patron {@code [^\.]*} en el ultimo segmento es lo que separa una ruta de cliente de un
 * fichero: /goals/123 no lleva extension y entra aqui, /assets/index-a1b2c3.js lleva punto y
 * cae en el servidor de estaticos. Sin esa restriccion este mapeo se comeria los assets de
 * Vite, porque los controllers tienen prioridad sobre los recursos estaticos.
 */
@Controller
public class SpaForwardingController {

    private static final String API_PREFIX = "/api";

    /**
     * Dos patrones porque uno solo no cubre las dos formas: el primero coge las rutas de un
     * nivel (/dashboard) y el segundo las anidadas (/goals/123, /goals/123/edit).
     * <p>
     * Las rutas /api/** ya mapeadas no se ven afectadas: entre varios patrones que casan gana
     * el mas especifico, y /api/reports/balance lo es mas que este comodin.
     */
    @GetMapping({"/{path:[^\\.]*}", "/**/{path:[^\\.]*}"})
    public String forward(HttpServletRequest request) throws NoResourceFoundException {
        String path = request.getRequestURI().substring(request.getContextPath().length());

        // Una ruta desconocida bajo /api es un 404 de API, no la pantalla del SPA. Sin esto un
        // /api/reprts mal escrito devolveria index.html con 200 y el cliente se comeria HTML
        // donde espera JSON. No basta con que /api/** este mapeado: eso solo cubre las rutas
        // que existen, y este comodin recogeria las que no.
        if (path.equals(API_PREFIX) || path.startsWith(API_PREFIX + "/")) {
            // El segundo argumento es el prefijo del servlet, vacio aqui porque la app se sirve
            // en la raiz; el tercero es la ruta que no se ha encontrado.
            throw new NoResourceFoundException(HttpMethod.GET, "", path);
        }

        return "forward:/index.html";
    }
}
