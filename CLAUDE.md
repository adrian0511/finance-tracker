# CLAUDE.md

Guía de contexto para Claude Code en este repositorio. Léela antes de tocar código.

## Qué es este proyecto

**FinanceTracker Monolith-API**: backend Spring Boot para gestión de finanzas
personales (cuentas, transacciones, reportes) con un asistente de IA integrado.
Es un monolito, un solo módulo Maven.

## Stack

- Java 21, Spring Boot 4.0.4
- Spring Data JPA + PostgreSQL
- Spring Security con JWT (stateless, sin sesiones)
- Lombok (usa `@Getter/@Setter/@Builder/@RequiredArgsConstructor`, casi nunca getters/setters manuales)
- MapStruct (`componentModel = "spring"`) para mapear entidad → DTO
- `prompt-link` (librería propia, `io.github.adrian0511:prompt-link`) para hablar con
  modelos de IA vía OpenRouter (`AiService.generate(prompt).getContent()`)

## Arquitectura y convenciones — SIGUE ESTE PATRÓN SIEMPRE

```
src/main/java/com/adrian/financetracker_monolith_api/
├── controller/     # Endpoints REST. @RestController + @RequiredArgsConstructor
├── service/
│   ├── interf/     # Interfaces de servicio (ej. AccountService)
│   └── impl/       # Implementaciones (ej. AccountServiceImpl)
├── repository/     # Spring Data JPA. @Repository, interfaces extends JpaRepository
├── entity/         # @Entity JPA. Lombok @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
├── dto/<dominio>/  # Un subpaquete por dominio: dto/account, dto/transaction, dto/goal...
├── mapper/         # MapStruct, un mapper por entidad
├── exception/<dominio>/  # Una excepción custom por caso, extiende RuntimeException
├── handler/        # GlobalExceptionHandler único con @RestControllerAdvice
├── security/       # JWT, filtros, config, evaluadores de ownership
└── util/           # Enums (Role, Type)
```

**Reglas concretas que ya sigue el código y hay que respetar:**

- Todas las entidades usan `UUID` como id, generado con `@GeneratedValue(strategy = GenerationType.UUID)`.
- Todo monto de dinero es `BigDecimal`, nunca `double`/`Double`, y de punta a punta: entidad,
  DTO, parámetros de servicio y operaciones (`add`/`subtract`, y `compareTo` en vez de `equals`
  para comparar, porque ignora la escala: `10.00` vs `10.0`).
- Cada excepción custom vive en su propio subpaquete de `exception/` y se registra en
  `handler/GlobalExceptionHandler.java` con un `@ExceptionHandler` que arma un `ErrorResponse`
  (`message`, `timestamp`, `status`, `path`).
- Los servicios que necesitan el usuario autenticado reciben `UUID userId` como parámetro;
  los controllers lo extraen con `@AuthenticationPrincipal CustomUserDetails user` y
  `user.getId()`. Nunca confíes en un `userId` que venga en el body/path sin validar ownership.
- Ownership entre recursos (¿esta cuenta/transacción es del usuario autenticado?) se valida
  con `@PreAuthorize` en el controller, usando `securityEvaluator` (`security/evaluator/`) o
  comparando contra `authentication.principal.id`. **Todo endpoint que recibe un id de recurso
  ajeno al usuario debe tener esta validación**, tanto si llega por path como por body
  (`@PreAuthorize("@securityEvaluator.isAccountOwner(#request.accountId, authentication) or hasRole('ADMIN')")`).
- DTOs de request llevan validación con `jakarta.validation` (`@NotBlank`, `@NotNull`,
  `@DecimalMin`, etc.) y los controllers los reciben con `@RequestBody @Valid`.
- Los mappers MapStruct usan `@Mapping(target = "xId", source = "x.id")` para aplanar
  relaciones `@ManyToOne` en el DTO de respuesta.
- Modelo de dominio: `User → Account → Transaction`. Las transacciones no conocen
  directamente al usuario (se llega vía `transaction.account.user`).

## Comandos

```bash
./mvnw compile          # compilar
./mvnw test              # tests (si existen para el módulo que tocas, créalos)
./mvnw spring-boot:run    # levantar localmente (requiere Postgres en localhost:5432/financetracker)
./mvnw package            # jar con el frontend dentro

# Solo backend: se salta el pnpm install + vite build de cada build
./mvnw test -Dfrontend.skip=true
```

**El build de Maven compila el frontend.** `frontend-maven-plugin` corre en `generate-resources`
(antes de que `process-resources` copie los recursos a `target/classes`, si no el jar saldría sin
SPA) y ejecuta `pnpm install --frozen-lockfile` + `pnpm build`. Se baja su propio Node y pnpm a
`frontend/node/`, con las versiones fijadas en las propiedades `node.version` / `pnpm.version`
del pom — no usa el Node del PATH, así que el resultado es el mismo aquí que en CI.
`src/main/resources/static/` es **artefacto de build y está en `.gitignore`**: no lo edites a
mano ni lo commitees, lo regenera el build.

**Siempre corre `./mvnw compile` después de cada cambio, antes de pasar al siguiente.**
No se puede compilar en este entorno de forma remota sin acceso a Maven Central — verifícalo
tú directamente en tu máquina.

## Configuración de IA

`application.yaml`, sección `ai:`. La librería `prompt-link` habla con OpenRouter
(`https://openrouter.ai/api/v1`). La API key sale de la variable de entorno `API_KEY`.

El campo `model` **debe** apuntar a un modelo con sufijo `:free` (catálogo vigente en
`https://openrouter.ai/models?max_price=0`). Ahora mismo es `openai/gpt-oss-20b:free`.
Ojo: si se borra esa clave, `AiProperties` cae en su default `openai/gpt-4o-mini`, que es
**de pago** — el modelo gratuito hay que dejarlo explícito, nunca confiar en el default.

Los prompts usan la sobrecarga `generate(systemPrompt, userPrompt)`: las instrucciones y el
rol van en el system prompt, los datos del usuario en el de usuario. Mantén esa separación
al añadir prompts nuevos — además de que el modelo obedece mejor, evita que el texto que
escribe el usuario se mezcle con las instrucciones.

## Invariantes que hay que mantener

Esto era la lista de deuda técnica; ya está toda corregida. Se queda documentada porque son
los sitios donde el código se rompió una vez y donde es fácil volver a romperlo.

1. **Toda operación que crea o borra una transacción ajusta `Account.balance`.**
   `TransactionServiceImpl.delete()` revierte el efecto antes de borrar (INCOME → restar,
   EXPENSE → sumar). Si añades edición de transacciones, tendrá que revertir el importe
   viejo y aplicar el nuevo.
2. **Cuidado con `@Transactional(readOnly = true)` copiado del método de al lado.**
   `delete()` lo tenía a pesar de escribir. Si el método modifica algo, va `@Transactional` a secas.
3. **`POST /api/transactions` valida ownership de la cuenta** con
   `@PreAuthorize("@securityEvaluator.isAccountOwner(#request.accountId, authentication) or hasRole('ADMIN')")`.
   Sin eso, cualquier usuario autenticado puede escribir en una cuenta ajena conociendo su UUID.
4. **`AccountService.increaseBalance/decreaseBalance` trabajan en `BigDecimal`.** No vuelvas a
   meter `.doubleValue()` en el flujo de dinero.
5. **Lo que se puede agregar en SQL se agrega en SQL, no en el servicio.** Sumar, contar,
   agrupar, ordenar y cortar son cosa de la query: traerse las filas para reducirlas en Java
   escala con el histórico del usuario, y la query no. En concreto:
   - Totales y desgloses: `totalIncomes/totalExpenses`, `countByUserAndDateBetween`,
     `findExpensesByCategory` (ordenada por `SUM(t.amount) DESC`),
     `findMonthlyNets`, `AccountRepository.totalBalance`.
   - Límites: `findRecentTransactions(userId, PageRequest.of(0, n))`, nunca
     `.sorted().limit(n)` sobre la lista entera.
   - `findCashFlow` calcula el balance acumulado con una función de ventana
     (`SUM(...) OVER (ORDER BY t.date, t.id)`). El desempate por `id` es obligatorio: sin él,
     el marco `RANGE` por defecto da a los movimientos del mismo instante el acumulado del
     grupo entero en vez del suyo.
   - La excepción es `AIServiceImpl.generateAnalysis`: suma sobre la muestra de 50 que ya tiene
     cargada, y ese total no es el mismo número que el total histórico.
   Estas queries no se pueden verificar con mocks (solo comprobarías que te devuelven lo que tú
   inventaste): van en `TransactionRepositoryAggregateTest`, que es `@DataJpaTest` contra el
   Postgres local con rollback. **Ese test necesita Postgres levantado.**
6. **Nada de `System.out.println`.** Usa `@Slf4j` y `log.debug` con logging parametrizado (`{}`).
7. **`SpaForwardingController` reenvía las rutas de React Router a `index.html`.** Es
   `@Controller`, no `@RestController` (el String es un nombre de vista, no un cuerpo), y sus
   patrones `{"/{path:[^\\.]*}", "/**/{path:[^\\.]*}"}` excluyen por diseño lo que lleva punto
   en el último segmento: los controllers tienen prioridad sobre los recursos estáticos, así que
   sin esa restricción el comodín se comería los assets de Vite. Dentro hay un guardia explícito
   para `/api`: un comodín así también recoge las rutas de API que **no** existen, y sin él un
   `/api/reprts` mal escrito devolvería `index.html` con 200 a un cliente que espera JSON.
8. **La cadena de seguridad es default-deny solo bajo `/api`.** `/api/**` pide token (salvo
   `/api/auth/**`) y `anyRequest().permitAll()` cubre el shell del SPA. Tiene que ser así: el
   navegador pide `index.html` y los assets sin cabecera `Authorization`, y sin el HTML no hay
   nada que pueda mandar el token después. Si añades un endpoint fuera de `/api`, será público
   por defecto — ponlo bajo `/api`.
9. **`NoResourceFoundException` tiene su propio `@ExceptionHandler` y devuelve 404.** Sin él lo
   caza el `@ExceptionHandler(Exception.class)` genérico y cualquier recurso que no existe
   responde **500**: era el caso de `/`, de `/favicon.ico` y de cualquier asset que faltase.
10. **Los informes con rango (`/balance`, `/category`, `/cashFlow`) resuelven `from`/`to` en
   `ReportServiceImpl.resolveRange`**, no en el controller: si vienen a null se aplican los
   últimos 6 meses hasta hoy (`LocalDate.now(clock)`, con el `Clock` inyectado para poder fijarlo
   en tests). Ambos límites son inclusivos, y el final llega hasta `LocalTime.MAX` para no dejar
   fuera los movimientos de ese mismo día.
11. **401 y 403 significan cosas distintas y no se pueden mezclar.** `SecurityConfig` registra
   un `authenticationEntryPoint` explícito (`HttpStatusEntryPoint(UNAUTHORIZED)`); sin él, el
   default de Spring Security es `Http403ForbiddenEntryPoint` y el que no manda token recibe el
   mismo 403 que el que intenta tocar un recurso ajeno. El cliente los trata distinto: **401** =
   no hay sesión → borra el token y va a `/login`; **403** = `@PreAuthorize` dice que el recurso
   es de otro, la sesión es válida y desloguear sería un error.

12. **El login responde lo mismo tanto si el usuario no existe como si la contraseña está mal.**
   Dos mensajes distintos convierten el login en un buscador de usuarios registrados. Se sostiene
   en dos sitios y hacen falta los dos: `SecurityBeansInjector.userDetailsService` lanza
   `UsernameNotFoundException` (la única que `DaoAuthenticationProvider` tapa, vía
   `hideUserNotFoundExceptions`, convirtiéndola en `BadCredentialsException`), y
   `AuthServiceImpl.login` caza ese `BadCredentialsException` y lanza
   `InvalidCredentialsException("Credenciales inválidas")` → 401. **No amplíes ese catch a
   `AuthenticationException`**: se tragaría los `InternalAuthenticationServiceException`, que son
   fallos de infraestructura y tienen que seguir siendo 500. Lo cubre
   `AuthControllerErrorsTest`, que compara que los dos mensajes sean idénticos.
13. **`DataIntegrityViolationException` tiene handler y devuelve 409.** Sin él lo cazaba el
   genérico y registrarse con un username ya cogido respondía **500**. El mensaje se decide
   mirando `getMostSpecificCause()`: si menciona `username` es "Ese nombre de usuario ya existe",
   si no, un texto genérico de conflicto — el handler cubre cualquier violación de integridad
   (una FK al borrar, por ejemplo) y ahí hablar de nombres de usuario sería mentir.

14. **`DELETE /api/transactions/{id}` es del dueño, no solo de ADMIN.** Estaba con
   `hasRole('ADMIN')`, lo que dejaba al usuario sin forma de deshacer un movimiento mal metido
   pese a que `TransactionServiceImpl.delete()` existe justo para eso (invariante 1). Ahora usa
   `@securityEvaluator.isTransactionOwner`, la misma regla que el `GET /{id}` de al lado.
15. **`GET /api/accounts` devuelve las cuentas del usuario autenticado y no lleva
   `@PreAuthorize`.** No es un olvido: el id sale del principal, no de la petición, así que no
   hay ningún id ajeno cuya propiedad validar. `AccountControllerTest` comprueba que dos usuarios
   distintos no se ven las cuentas. `GET /api/accounts/users/{id}` se queda para ADMIN.
16. **El estado que devuelve OpenRouter no se propaga: los fallos de IA son 503, o 429 si es
   cuota.** `AiClientException.getStatusCode()` **no es un estado HTTP**: es negativo cuando el
   fallo ocurrió sin respuesta (-1 red, -2 respuesta vacía, -3 configuración, -4 corte de stream).
   Hacer `HttpStatus.valueOf()` de eso lanzaba dentro del propio handler, Spring se quedaba sin
   respuesta de error y **la petición terminaba en 200**: un fallo servido como éxito. Y para los
   errores HTTP reales, reenviar el estado tal cual convertía un 401 de OpenRouter (nuestra API
   key) en un 401 nuestro, que el cliente lee como "se acabó la sesión" y desloguea al usuario por
   un problema del servidor. El 429 se mantiene porque significa lo mismo de los dos lados, y
   además lleva los segundos de espera que OpenRouter manda en `error.metadata.retry_after_seconds`
   — en la cabecera `Retry-After` y dentro del mensaje. Ese cuerpo lo escribe un tercero, así que
   si no se puede leer se responde igual sin el dato: el `ObjectMapper` que hace falta es el de
   **Jackson 3** (`tools.jackson`), que es el único del que hay bean en Spring Boot 4. Lo cubren
   siete tests en `AIControllerTest`.
17. **El tope de tiempo de la IA es `AIServiceImpl.TOTAL_TIMEOUT`, no `ai.read-timeout`.** El de la
   librería es de **inactividad**, y OpenRouter manda keep-alive mientras el modelo genera, así que
   la conexión nunca se queda quieta: se midió una llamada de 268 s con el límite en 60. El tope
   total va donde está porque `generate(kind, systemPrompt, userPrompt)` es el único punto por el
   que pasan los cuatro endpoints. La llamada se lanza en un hilo virtual y se deja de esperar a
   los 90 s — el hilo abandonado sigue vivo hasta que la librería corte, porque una lectura de
   socket bloqueada no atiende a la interrupción; lo que queda acotado es la espera del usuario.

## Estado del proyecto y qué viene después

El plan de mejoras que guiaba esto (`finance-tracker-plan-de-mejoras.md`) está terminado y el
archivo ya no está en el repo. Punto de partida de hoy:

**Backend.** Auth con JWT (`/api/auth/register|login`) y el resto de la API bajo `/api`:
usuarios, cuentas, transacciones, cuatro informes (`/api/reports/balance|category|monthly|cashFlow`,
con rango opcional que resuelve el servicio), metas de ahorro con proyección a tres escenarios
(`/api/goals`, `/api/goals/{id}/projection`) y cuatro endpoints de IA
(`/api/ai/analysis|report|categorize|chat`) contra un modelo `:free` de OpenRouter.

**Frontend.** SPA de React/Vite que empaqueta el propio build de Maven y se sirve desde el jar:
login y registro, dashboard con periodo compartido y cuatro gráficos, cuentas, movimientos con
filtro por tipo y categoría y paginación, y metas con su pantalla de detalle. Sistema de tokens
propio con tema claro/oscuro. Detalles en `frontend/CLAUDE.md`.

**Lo siguiente: presupuestos por categoría** (`Budget`, `/api/budgets/*`), que era el punto que
quedó fuera del plan. Un presupuesto es un tope mensual para una categoría; lo gastado no se
guarda, se calcula agregando en SQL sobre `transaction` (invariante 5), igual que
`findExpensesByCategory`.

Dos huecos conocidos, por si se cruzan con lo que estés tocando:

- **El único `PUT` de la API es `/api/users/{id}`.** No hay forma de editar ni un movimiento, ni
  una cuenta, ni una meta: se crean y se borran. Si añades la edición de transacciones, el
  invariante 1 dice lo que hay que respetar (revertir el importe viejo y aplicar el nuevo sobre
  `Account.balance`).
- **`SavingsGoal` no guarda lo ahorrado.** No tiene `currentAmount`: el progreso y los tres
  escenarios se derivan del histórico de movimientos. No le añadas un campo acumulado sin
  pensarlo, porque entonces habría dos fuentes de verdad para el mismo número.

No saltes de un punto a otro sin compilar y, si aplica, sin correr tests.

## Tests

Nueve clases, **78 tests**, todos en verde:

| Clase | Tests | Qué es |
|---|---|---|
| `AIControllerTest` | 21 | `@SpringBootTest` + MockMvc, `AiService` mockeado |
| `SavingsGoalServiceImplProjectionTest` | 16 | unitario, Mockito + `Clock` fijo |
| `ReportServiceImplRangeTest` | 10 | unitario, Mockito + `Clock` fijo |
| `SpaForwardingControllerTest` | 9 | `@SpringBootTest` + MockMvc |
| `TransactionRepositoryAggregateTest` | 8 | `@DataJpaTest` contra el Postgres local |
| `TransactionControllerTest` | 6 | `@SpringBootTest` + MockMvc |
| `AccountControllerTest` | 4 | `@SpringBootTest` + MockMvc |
| `AuthControllerErrorsTest` | 3 | `@SpringBootTest` + MockMvc |
| `FinancetrackerMonolithApiApplicationTests` | 1 | el `contextLoads` de siempre |

**Todo lo que levanta contexto necesita Postgres levantado** — es decir, todo menos los dos
unitarios con `Clock` fijo.

Ojo con estas cuatro cosas al escribir tests nuevos:

- **`spring-security-test` no está en el pom**, así que no hay `@WithMockUser`: para autenticar hay
  que sacar un token real por `/api/auth/register` + `/api/auth/login`.
- **`@Transactional` en el test no vale para comprobar que algo quedó guardado.** Con una sola
  transacción envolviendo todas las peticiones se lee el estado en memoria de esa transacción, que
  diría lo mismo aunque nada se hubiera confirmado. Por eso `TransactionControllerTest` (que
  comprueba el ajuste de saldo del invariante 1) y `AuthControllerErrorsTest` van sin él y limpian
  a mano en `@AfterEach`, mientras que `AccountControllerTest` sí lo usa y no limpia nada.
- **Al limpiar, de dentro afuera**: `transaction.account_id` es NOT NULL y no hay cascada, así que
  borrar una cuenta antes que sus movimientos revienta contra la foreign key.
- **Para mockear un bean del contexto va `@MockitoBean`, no `@MockBean`**: este proyecto es Spring
  Boot 4 y el segundo ya no existe (deprecado en 3.4, retirado en 4.0). `AIControllerTest` sustituye
  así el `AiService` de prompt-link, que es lo que le permite comprobar que las ramas de guardia
  responden **sin** llamar al modelo — y de paso hace que la suite no dependa de la red ni de la
  `API_KEY`.

La cobertura de ownership vive en `TransactionControllerTest`: es la red que sujeta los invariantes
3 y 14. Los dos casos de 403 se comprobaron quitando a mano los `@PreAuthorize` del controller, y
fallan; si algún día pasan con las anotaciones quitadas, el test dejó de servir para nada.

## Qué NO hacer

- No introduzcas un ORM/librería nueva sin preguntar — el proyecto es deliberadamente simple.
- No cambies el paquete base (`com.adrian.financetracker_monolith_api`) ni la estructura
  `interf`/`impl`, aunque no sea la convención más común en Spring — es la que ya usa
  todo el repo.
- No hardcodees secretos (JWT secret, API keys) — siempre vía `application.yaml` +
  variables de entorno, como ya está hecho.
- No agregues un modelo de IA de pago por defecto sin dejarlo explícito y documentado.