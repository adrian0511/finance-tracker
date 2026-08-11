package com.adrian.financetracker_monolith_api.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

/**
 * GET /api/accounts saca el id del usuario del principal, no de la peticion, asi que no lleva
 * @PreAuthorize. Lo que hay que demostrar es justamente eso: que no hay forma de que devuelva
 * las cuentas de otro.
 *
 * Necesita Postgres levantado, como el resto de tests de contexto.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("GET /api/accounts")
class AccountControllerTest {

    private static final String PASSWORD = "secreto123";

    @Autowired
    private MockMvc mvc;

    @Test
    @DisplayName("devuelve solo las cuentas del usuario del token")
    void returnsOnlyTheCallersAccounts() throws Exception {
        String mine = registerAndLogin();
        String other = registerAndLogin();

        createAccount(mine, "Mi corriente");
        createAccount(other, "La de otro");

        mvc.perform(get("/api/accounts").header("Authorization", "Bearer " + mine))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Mi corriente"));

        mvc.perform(get("/api/accounts").header("Authorization", "Bearer " + other))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("La de otro"));
    }

    @Test
    @DisplayName("sin cuentas devuelve una lista vacia, no un 404")
    void returnsAnEmptyListWhenThereAreNoAccounts() throws Exception {
        mvc.perform(get("/api/accounts").header("Authorization", "Bearer " + registerAndLogin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("sin token es 401")
    void requiresAToken() throws Exception {
        mvc.perform(get("/api/accounts")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("la cuenta nueva nace con saldo cero")
    void newAccountsStartAtZero() throws Exception {
        mvc.perform(post("/api/accounts")
                        .header("Authorization", "Bearer " + registerAndLogin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Ahorro"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.balance").value(0));
    }

    private void createAccount(String token, String name) throws Exception {
        mvc.perform(post("/api/accounts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s"}
                                """.formatted(name)))
                .andExpect(status().isCreated());
    }

    /** Sin spring-security-test en el pom no hay @WithMockUser: el token se saca de verdad. */
    private String registerAndLogin() throws Exception {
        String username = "account-test-" + UUID.randomUUID();

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s","email":"acc@test.com",
                                 "name":"Acc","lastName":"Test"}
                                """.formatted(username, PASSWORD)))
                .andExpect(status().isCreated());

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
