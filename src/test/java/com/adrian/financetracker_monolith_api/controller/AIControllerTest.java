package com.adrian.financetracker_monolith_api.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.adrian.financetracker_monolith_api.repository.AccountRepository;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;

import io.github.adrian0511.prompt_link.dto.AiResponse;
import io.github.adrian0511.prompt_link.service.AiService;

/**
 * /api/ai: quien puede entrar, que entra y cuando NO se llama al modelo.
 *
 * <p>El {@code AiService} de prompt-link se sustituye por un mock con {@code @MockitoBean}. No es
 * solo por no gastar la cuota del modelo gratuito: sin mock, el test dependeria de la red y de una
 * API key, y en CI no hay ninguna de las dos. Ademas es lo que permite comprobar lo que de verdad
 * interesa de las dos ramas de guardia — que ni siquiera se intenta la llamada.
 *
 * <p>Es {@code @MockitoBean} y no {@code @MockBean} porque este proyecto va con Spring Boot 4:
 * {@code @MockBean} se deprecio en 3.4 y ya no existe. La sustituta vive en Spring Framework
 * ({@code org.springframework.test.context.bean.override.mockito}) y hace lo mismo. Es el primer
 * sitio del repo que mockea un bean del contexto; el resto de tests unitarios usan {@code @Mock}
 * de Mockito a secas, que aqui no vale porque el bean lo tiene que reemplazar el contexto.
 *
 * <p>Necesita Postgres levantado, como el resto de tests de contexto.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("/api/ai")
class AIControllerTest {

    private static final String PASSWORD = "secreto123";

    @Autowired
    private MockMvc mvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private TransactionRepository transactionRepository;

    @MockitoBean
    private AiService aiService;

    private final List<String> usernames = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (String username : usernames) {
            userRepository.findByUsername(username).ifPresent(user -> {
                accountRepository.findByUserId(user.getId()).forEach(account -> {
                    transactionRepository
                            .deleteAll(transactionRepository.findByAccountIdOrderByDateDesc(account.getId()));
                    accountRepository.delete(account);
                });
                userRepository.delete(user);
            });
        }

        usernames.clear();
    }

    /**
     * La cadena de seguridad es default-deny solo bajo /api, y /api/ai no esta en ninguna lista de
     * excepciones. Que sea 401 y no 403 tampoco es un detalle: el cliente los trata distinto — 401
     * borra la sesion y manda al login, 403 no.
     */
    @Nested
    @DisplayName("sin token")
    class WithoutAToken {

        @Test
        @DisplayName("GET /analysis es 401")
        void analysisIsUnauthorized() throws Exception {
            mvc.perform(get("/api/ai/analysis")).andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /report es 401")
        void reportIsUnauthorized() throws Exception {
            mvc.perform(get("/api/ai/report")).andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /categorize es 401")
        void categorizeIsUnauthorized() throws Exception {
            mvc.perform(post("/api/ai/categorize")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"description":"Cena con amigos"}
                                    """))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /chat es 401")
        void chatIsUnauthorized() throws Exception {
            mvc.perform(post("/api/ai/chat")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"message":"Como ahorro mas?"}
                                    """))
                    .andExpect(status().isUnauthorized());
        }

        /** Un 401 tiene que cortar antes del controller: el modelo no se toca sin sesion. */
        @Test
        @DisplayName("ninguno llega a llamar al modelo")
        void noneOfThemReachesTheModel() throws Exception {
            mvc.perform(get("/api/ai/analysis")).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/ai/report")).andExpect(status().isUnauthorized());
            mvc.perform(post("/api/ai/categorize")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"description":"Cena con amigos"}
                                    """))
                    .andExpect(status().isUnauthorized());
            mvc.perform(post("/api/ai/chat")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"message":"Como ahorro mas?"}
                                    """))
                    .andExpect(status().isUnauthorized());

            verify(aiService, never()).generate(anyString());
            verify(aiService, never()).generate(anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("validacion del cuerpo")
    class BodyValidation {

        @Test
        @DisplayName("categorize con description vacia es 400")
        void blankDescriptionIsABadRequest() throws Exception {
            postJson("/api/ai/categorize", """
                    {"description":"   "}
                    """).andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("categorize sin description es 400")
        void missingDescriptionIsABadRequest() throws Exception {
            postJson("/api/ai/categorize", "{}").andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("chat con message vacio es 400")
        void blankMessageIsABadRequest() throws Exception {
            postJson("/api/ai/chat", """
                    {"message":""}
                    """).andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("chat sin message es 400")
        void missingMessageIsABadRequest() throws Exception {
            postJson("/api/ai/chat", "{}").andExpect(status().isBadRequest());
        }

        /**
         * El 400 lo decide @Valid antes de entrar al metodo, asi que el modelo no se llega a
         * llamar. Sin esta comprobacion, una peticion vacia podria estar gastando cuota.
         */
        @Test
        @DisplayName("un cuerpo invalido no llega al modelo")
        void anInvalidBodyNeverReachesTheModel() throws Exception {
            postJson("/api/ai/categorize", "{}").andExpect(status().isBadRequest());
            postJson("/api/ai/chat", "{}").andExpect(status().isBadRequest());

            verify(aiService, never()).generate(anyString(), anyString());
        }

        private ResultActions postJson(String path, String body) throws Exception {
            return mvc.perform(post(path)
                    .header("Authorization", "Bearer " + registerAndLogin())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body));
        }
    }

    /**
     * Las dos ramas de guardia. Lo que se protege no es el texto, es que se responda sin gastar una
     * llamada: son los dos unicos casos en los que el endpoint puede contestar por su cuenta.
     */
    @Nested
    @DisplayName("sin datos que analizar")
    class WithoutData {

        @Test
        @DisplayName("el analisis de un usuario sin movimientos no llama al modelo")
        void analysisOfAnEmptyHistoryDoesNotCallTheModel() throws Exception {
            mvc.perform(get("/api/ai/analysis")
                            .header("Authorization", "Bearer " + registerAndLogin()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.response", containsString("Todavia no hay movimientos")))
                    .andExpect(jsonPath("$.timestamp").isNotEmpty());

            verify(aiService, never()).generate(anyString(), anyString());
        }

        /**
         * El mes lo pone {@code YearMonth.now()} dentro del servicio, que no recibe ningun Clock
         * (al contrario que ReportServiceImpl). Por eso se comprueba el principio del mensaje y no
         * el mes concreto: afirmar el mes obligaria a calcularlo aqui otra vez y el test fallaria
         * una vez cada muchos anos, justo en el cambio de mes entre las dos lecturas del reloj.
         */
        @Test
        @DisplayName("el informe de un mes sin movimientos no llama al modelo")
        void reportOfAnEmptyMonthDoesNotCallTheModel() throws Exception {
            mvc.perform(get("/api/ai/report")
                            .header("Authorization", "Bearer " + registerAndLogin()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.response", startsWith("No hay movimientos registrados en")));

            verify(aiService, never()).generate(anyString(), anyString());
        }
    }

    /**
     * Los dos endpoints que siempre llaman al modelo. No comprueban lo que responde la IA — eso no
     * es comprobable — sino que su respuesta llega intacta al cliente. Y de paso demuestran que el
     * mock esta puesto: con el AiService de verdad esto seria un error de configuracion por falta
     * de API key, no un 200.
     */
    @Nested
    @DisplayName("con el modelo mockeado")
    class WithAMockedModel {

        @Test
        @DisplayName("categorize devuelve la categoria que da el modelo")
        void categorizeReturnsWhatTheModelSays() throws Exception {
            when(aiService.generate(anyString(), anyString())).thenReturn(new AiResponse("Comida"));

            mvc.perform(post("/api/ai/categorize")
                            .header("Authorization", "Bearer " + registerAndLogin())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"description":"Cena con amigos"}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.response").value("Comida"));
        }

        @Test
        @DisplayName("chat devuelve la respuesta del modelo")
        void chatReturnsTheModelsAnswer() throws Exception {
            when(aiService.generate(anyString(), anyString()))
                    .thenReturn(new AiResponse("Empieza por un fondo de emergencia."));

            mvc.perform(post("/api/ai/chat")
                            .header("Authorization", "Bearer " + registerAndLogin())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"message":"Como ahorro mas?"}
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.response").value("Empieza por un fondo de emergencia."));
        }
    }

    // ------------------------------------------------------------------ ayudantes

    /** Sin spring-security-test en el pom no hay @WithMockUser: el token se saca de verdad. */
    private String registerAndLogin() throws Exception {
        String username = "ai-test-" + UUID.randomUUID();

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s","email":"ai@test.com",
                                 "name":"Ai","lastName":"Test"}
                                """.formatted(username, PASSWORD)))
                .andExpect(status().isCreated());

        usernames.add(username);

        String response = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(response, "$.token");
    }
}
