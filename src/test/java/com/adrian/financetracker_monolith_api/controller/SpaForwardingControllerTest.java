package com.adrian.financetracker_monolith_api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/**
 * El fallback de SPA se prueba contra la app entera, no con un slice: lo que hay que verificar
 * es justo la convivencia entre este mapeo, las rutas /api/** ya mapeadas, el servidor de
 * estaticos y la cadena de seguridad. Necesita Postgres levantado, como el resto de tests de
 * contexto.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Fallback de rutas de React Router")
class SpaForwardingControllerTest {

    @Autowired
    private MockMvc mvc;

    @Nested
    @DisplayName("rutas de cliente")
    class ClientRoutes {

        @Test
        @DisplayName("una ruta de primer nivel va a index.html")
        void firstLevelRouteIsForwarded() throws Exception {
            mvc.perform(get("/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl("/index.html"));
        }

        @Test
        @DisplayName("una ruta anidada con id tambien va a index.html")
        void nestedRouteIsForwarded() throws Exception {
            mvc.perform(get("/goals/123"))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl("/index.html"));
        }

        @Test
        @DisplayName("una ruta de tres niveles tambien va a index.html")
        void deepRouteIsForwarded() throws Exception {
            mvc.perform(get("/goals/123/edit"))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl("/index.html"));
        }

        @Test
        @DisplayName("solo cuenta el punto del ultimo segmento")
        void routeWithADotInTheMiddleIsStillARoute() throws Exception {
            mvc.perform(get("/users/nombre.apellido/goals"))
                    .andExpect(status().isOk())
                    .andExpect(forwardedUrl("/index.html"));
        }

        @Test
        @DisplayName("se sirven sin token: el navegador pide el HTML sin cabecera Authorization")
        void clientRoutesArePublic() throws Exception {
            mvc.perform(get("/goals/123"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("la raiz la resuelve el welcome page de Spring Boot, y nunca es un 500")
        void rootIsServedByTheWelcomePage() throws Exception {
            // La raiz no pasa por SpaForwardingController: la sirve el welcome page de Boot, que
            // reenvia a "index.html" (sin barra inicial, a diferencia del "/index.html" del
            // fallback). El status depende de si alguien ha corrido pnpm build: 200 con el
            // frontend compilado en static/, 404 sin el. Lo que se fija aqui es que no vuelva a
            // ser 500, que es lo que devolvia antes de que NoResourceFoundException tuviera
            // su propio handler.
            int status = mvc.perform(get("/")).andReturn().getResponse().getStatus();

            assertThat(status).isIn(200, 404);
        }
    }

    @Nested
    @DisplayName("lo que el fallback NO debe capturar")
    class NotForwarded {

        @Test
        @DisplayName("los assets de Vite van al servidor de estaticos, y si faltan es 404")
        void assetsAreNotForwarded() throws Exception {
            mvc.perform(get("/assets/index-a1b2c3.js"))
                    .andExpect(status().isNotFound())
                    .andExpect(forwardedUrl(null));
            mvc.perform(get("/assets/index-a1b2c3.css"))
                    .andExpect(status().isNotFound())
                    .andExpect(forwardedUrl(null));
            mvc.perform(get("/favicon.ico"))
                    .andExpect(status().isNotFound())
                    .andExpect(forwardedUrl(null));
        }

        @Test
        @DisplayName("una ruta de API sigue pidiendo token, no devuelve el HTML del SPA")
        void apiRoutesStillRequireAuthentication() throws Exception {
            mvc.perform(get("/api/reports/balance"))
                    .andExpect(status().isForbidden())
                    .andExpect(forwardedUrl(null));
        }

        @Test
        @DisplayName("una ruta inexistente bajo /api es 404 JSON aun con token valido")
        void unknownApiRouteIsNotFoundForAnAuthenticatedUser() throws Exception {
            // Con token es cuando de verdad se ve: sin el, el 403 taparia que el comodin
            // esta devolviendo index.html donde el cliente espera JSON.
            String token = registerAndLogin();

            mvc.perform(get("/api/no-existe").header("Authorization", "Bearer " + token))
                    .andExpect(status().isNotFound())
                    .andExpect(forwardedUrl(null))
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.path").value("/api/no-existe"));
        }
    }

    /** Usa los endpoints reales de auth: son los unicos publicos bajo /api. */
    private String registerAndLogin() throws Exception {
        String username = "spa-test-" + UUID.randomUUID();
        String credentials = """
                {"username":"%s","password":"secreto123","email":"spa@test.com",
                 "name":"Spa","lastName":"Test"}
                """.formatted(username);

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials))
                .andExpect(status().isCreated());

        String response = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"secreto123"}
                                """.formatted(username)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(response, "$.token");
    }
}
