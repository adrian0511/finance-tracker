package com.adrian.financetracker_monolith_api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.adrian.financetracker_monolith_api.repository.UserRepository;

/**
 * Errores de /api/auth. Deliberadamente **sin** {@code @Transactional}: la violacion de la
 * restriccion unique salta al hacer flush, y con la transaccion del test abarcando las dos
 * peticiones el insert duplicado no llegaria a la base de datos hasta el final, asi que el 409
 * no se veria. Por eso cada usuario creado se borra a mano en el {@code @AfterEach}.
 *
 * Necesita Postgres levantado, como el resto de tests de contexto.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Errores de autenticacion")
class AuthControllerErrorsTest {

    private static final String PASSWORD = "secreto123";

    @Autowired
    private MockMvc mvc;
    @Autowired
    private UserRepository userRepository;

    private String username;

    @AfterEach
    void cleanUp() {
        if (username != null) {
            userRepository.findByUsername(username).ifPresent(userRepository::delete);
        }
    }

    @Test
    @DisplayName("registrarse con un username ya cogido es 409, no el 500 del handler generico")
    void duplicateUsernameIsAConflict() throws Exception {
        register().andExpect(status().isCreated());

        register()
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Ese nombre de usuario ya existe"))
                .andExpect(jsonPath("$.path").value("/api/auth/register"));
    }

    /**
     * La propiedad que se protege aqui no es el texto, es que los dos casos sean el **mismo**
     * texto: en cuanto se distinguen, el login sirve para averiguar que usuarios existen.
     */
    @Test
    @DisplayName("usuario inexistente y contrasena incorrecta responden exactamente lo mismo")
    void wrongUserAndWrongPasswordAreIndistinguishable() throws Exception {
        register().andExpect(status().isCreated());

        String unknownUser = login("no-existe-" + UUID.randomUUID(), PASSWORD)
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        String wrongPassword = login(username, "esta-no-es")
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(messageOf(unknownUser)).isEqualTo(messageOf(wrongPassword));
    }

    @Test
    @DisplayName("las credenciales correctas siguen devolviendo token")
    void validCredentialsStillReturnAToken() throws Exception {
        register().andExpect(status().isCreated());

        login(username, PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    private ResultActions register() throws Exception {
        if (username == null) {
            username = "auth-test-" + UUID.randomUUID();
        }

        return mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"username":"%s","password":"%s","email":"auth@test.com",
                         "name":"Auth","lastName":"Test"}
                        """.formatted(username, PASSWORD)));
    }

    private ResultActions login(String user, String password) throws Exception {
        return mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"username":"%s","password":"%s"}
                        """.formatted(user, password)));
    }

    /** El timestamp cambia entre respuestas, asi que se comparan solo los mensajes. */
    private String messageOf(String body) {
        return com.jayway.jsonpath.JsonPath.read(body, "$.message");
    }
}
