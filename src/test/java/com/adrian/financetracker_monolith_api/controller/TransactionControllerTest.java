package com.adrian.financetracker_monolith_api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.adrian.financetracker_monolith_api.entity.User;
import com.adrian.financetracker_monolith_api.repository.AccountRepository;
import com.adrian.financetracker_monolith_api.repository.TransactionRepository;
import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.util.Role;
import com.jayway.jsonpath.JsonPath;

/**
 * Ownership y saldo de /api/transactions. Es el sitio donde estaba el bug P0 original: sin el
 * {@code @PreAuthorize} del POST, cualquier usuario autenticado podia escribir en una cuenta
 * ajena con solo conocer su UUID. Ese caso es el test que de verdad importa de aqui — si alguien
 * quita esa anotacion en un refactor, esto es lo unico que se entera.
 *
 * Deliberadamente <strong>sin</strong> {@code @Transactional}, al contrario que
 * {@code AccountControllerTest}. Lo que se comprueba al borrar es que el saldo de la cuenta quedo
 * ajustado, y con una unica transaccion de test envolviendo todas las peticiones se estaria
 * leyendo el estado en memoria de esa transaccion, no lo que quedo escrito: pasaria igual aunque
 * nada se hubiera confirmado. A cambio, lo creado hay que deshacerlo a mano en el
 * {@code @AfterEach}, como en {@code AuthControllerErrorsTest}.
 *
 * Necesita Postgres levantado, como el resto de tests de contexto.
 */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("/api/transactions")
class TransactionControllerTest {

    private static final String PASSWORD = "secreto123";

    @Autowired
    private MockMvc mvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private TransactionRepository transactionRepository;

    /** Los usuarios que ha creado el test, para poder deshacer lo suyo al terminar. */
    private final List<String> usernames = new ArrayList<>();

    /**
     * De dentro afuera: {@code transaction.account_id} es NOT NULL y no hay cascada, asi que
     * borrar la cuenta antes que sus movimientos revienta contra la foreign key.
     */
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

    @Test
    @DisplayName("el dueno de la cuenta puede crear un movimiento en ella")
    void theOwnerCanCreateATransaction() throws Exception {
        String token = registerAndLogin();
        String accountId = createAccount(token);

        mvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(transactionBody(accountId, "INCOME", "100.00", "Nomina")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.accountId").value(accountId))
                .andExpect(jsonPath("$.type").value("INCOME"));

        assertThat(balanceOf(token, accountId)).isEqualByComparingTo("100.00");
    }

    /**
     * La regresion del P0. El 403 es la mitad de la comprobacion; la otra mitad es que la cuenta
     * ajena siga intacta, porque un fallo que devolviera 403 despues de haber tocado el saldo
     * seria igual de grave y el codigo de estado por si solo no lo distingue.
     */
    @Test
    @DisplayName("otro usuario no puede crear un movimiento en una cuenta ajena")
    void aStrangerCannotWriteIntoSomeoneElsesAccount() throws Exception {
        String owner = registerAndLogin();
        String stranger = registerAndLogin();
        String accountId = createAccount(owner);

        mvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + stranger)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(transactionBody(accountId, "INCOME", "500.00", "Regalo")))
                .andExpect(status().isForbidden());

        assertThat(balanceOf(owner, accountId)).isEqualByComparingTo("0");
        assertThat(transactionRepository.existsByAccountId(UUID.fromString(accountId))).isFalse();
    }

    @Test
    @DisplayName("borrar un ingreso se lo resta al saldo de la cuenta")
    void deletingAnIncomeSubtractsItBack() throws Exception {
        String token = registerAndLogin();
        String accountId = createAccount(token);
        String transactionId = createTransaction(token, accountId, "INCOME", "100.00", "Nomina");

        assertThat(balanceOf(token, accountId)).isEqualByComparingTo("100.00");

        mvc.perform(delete("/api/transactions/{id}", transactionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertThat(balanceOf(token, accountId)).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("borrar un gasto se lo suma al saldo de la cuenta")
    void deletingAnExpenseAddsItBack() throws Exception {
        String token = registerAndLogin();
        String accountId = createAccount(token);

        // La cuenta nace a cero y un gasto mayor que el saldo es un 409: primero hay que meter
        // dinero para poder gastarlo.
        createTransaction(token, accountId, "INCOME", "100.00", "Nomina");
        String expenseId = createTransaction(token, accountId, "EXPENSE", "30.00", "Comida");

        assertThat(balanceOf(token, accountId)).isEqualByComparingTo("70.00");

        mvc.perform(delete("/api/transactions/{id}", expenseId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertThat(balanceOf(token, accountId)).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("otro usuario no puede borrar un movimiento ajeno")
    void aStrangerCannotDeleteSomeoneElsesTransaction() throws Exception {
        String owner = registerAndLogin();
        String stranger = registerAndLogin();
        String accountId = createAccount(owner);
        String transactionId = createTransaction(owner, accountId, "INCOME", "100.00", "Nomina");

        mvc.perform(delete("/api/transactions/{id}", transactionId)
                        .header("Authorization", "Bearer " + stranger))
                .andExpect(status().isForbidden());

        // El movimiento sigue ahi y el saldo no se ha movido: el 403 no puede haber llegado
        // despues de hacer el trabajo.
        mvc.perform(get("/api/transactions/{id}", transactionId)
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk());
        assertThat(balanceOf(owner, accountId)).isEqualByComparingTo("100.00");
    }

    /**
     * El rol se cambia en la base de datos porque {@code AuthServiceImpl.register} crea siempre
     * {@code Role.USER} y no hay ningun endpoint para promover a nadie. Vale con eso: las
     * autoridades no salen del token, las recarga {@code JwtAuthenticationFilter} del usuario en
     * cada peticion.
     */
    @Test
    @DisplayName("un ADMIN si puede borrar un movimiento ajeno")
    void anAdminCanDeleteSomeoneElsesTransaction() throws Exception {
        String owner = registerAndLogin();
        String admin = registerAndLoginAsAdmin();
        String accountId = createAccount(owner);
        String transactionId = createTransaction(owner, accountId, "INCOME", "100.00", "Nomina");

        mvc.perform(delete("/api/transactions/{id}", transactionId)
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());

        assertThat(balanceOf(owner, accountId)).isEqualByComparingTo("0");
    }

    // ------------------------------------------------------------------ ayudantes

    private String createAccount(String token) throws Exception {
        String response = mvc.perform(post("/api/accounts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Corriente"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(response, "$.id");
    }

    private String createTransaction(String token, String accountId, String type, String amount, String category)
            throws Exception {
        String response = mvc.perform(post("/api/transactions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(transactionBody(accountId, type, amount, category)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(response, "$.id");
    }

    private String transactionBody(String accountId, String type, String amount, String category) {
        return """
                {"accountId":"%s","type":"%s","amount":%s,"category":"%s"}
                """.formatted(accountId, type, amount, category);
    }

    /**
     * El saldo se lee por la API y no del repositorio: asi se comprueba lo que quedo guardado de
     * verdad. Se compara con {@code isEqualByComparingTo} porque lo que importa es el valor y no
     * la escala — 100 y 100.00 son el mismo dinero, y {@code equals} de BigDecimal dice que no.
     */
    private BigDecimal balanceOf(String token, String accountId) throws Exception {
        String response = mvc.perform(get("/api/accounts/{id}", accountId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return new BigDecimal(JsonPath.read(response, "$.balance").toString());
    }

    /** Sin spring-security-test en el pom no hay @WithMockUser: el token se saca de verdad. */
    private String registerAndLogin() throws Exception {
        return login(register());
    }

    private String registerAndLoginAsAdmin() throws Exception {
        String username = register();

        User user = userRepository.findByUsername(username).orElseThrow();
        user.setRole(Role.ADMIN);
        userRepository.save(user);

        return login(username);
    }

    private String register() throws Exception {
        String username = "transaction-test-" + UUID.randomUUID();

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s","email":"tx@test.com",
                                 "name":"Tx","lastName":"Test"}
                                """.formatted(username, PASSWORD)))
                .andExpect(status().isCreated());

        // Se apunta despues del 201: si el registro falla no hay nada que borrar.
        usernames.add(username);

        return username;
    }

    private String login(String username) throws Exception {
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
