# CLAUDE.md — Frontend (finance-tracker/frontend)

Guía de contexto para Claude Code al trabajar en la carpeta `frontend/` de este
repositorio. El backend Spring Boot vive en `src/`, con su propio `CLAUDE.md` en la raíz
del repo — léelo también si tocás algo que cruce ambos lados (ej. un DTO nuevo).

## Qué es esto

El frontend de `finance-tracker` vive **dentro del mismo repo** que el backend, en
`frontend/`. Compila a `src/main/resources/static/`, y Spring Boot lo sirve desde ahí
en el mismo origen que la API — no hay CORS, no hay dominios separados, no hay variable
de entorno de URL de API en producción.

## Stack

- Vite + React + TypeScript
- **pnpm** como package manager (no npm, no yarn — usa siempre `pnpm`)
- TanStack Query — todo el estado de servidor
- Zustand — solo estado de auth
- React Router
- Axios (`baseURL: '/api'`, relativo)
- Recharts — todos los gráficos
- react-hook-form + zod
- Tailwind CSS

## Cómo se conecta con el backend (importante, no es obvio)

- **Dev**: `pnpm dev` levanta Vite en su propio puerto, con un proxy configurado en
  `vite.config.ts` (`server.proxy['/api'] → http://localhost:8080`) que reenvía las
  llamadas a la API al backend de Spring corriendo aparte. El navegador ve todo como
  mismo origen gracias al proxy, así que no hace falta CORS ni en dev.
- **Prod**: `pnpm build` compila directo a `../src/main/resources/static/`
  (`build.outDir` en `vite.config.ts`). Spring Boot lo sirve como estático, y como es el
  mismo origen que `/api/**`, tampoco hace falta CORS.
- Por eso el cliente Axios usa `baseURL: '/api'` (ruta relativa) en ambos casos — nunca
  una URL absoluta ni una variable de entorno de host.
- **Rutas del lado del cliente (React Router)**: el fallback ya existe, es
  `src/main/java/.../controller/SpaForwardingController.java`, y reenvía a `index.html`
  cualquier ruta sin extensión que no cuelgue de `/api`. Refrescar en `/goals/123/edit`
  funciona. Lo que **no** entra por ahí es `/`: esa la resuelve el welcome page de Spring
  Boot, y solo funciona si `pnpm build` ya dejó un `index.html` en `static/`.
- **El shell es público, la API no**: `SecurityConfig` pide token para `/api/**` (menos
  `/api/auth/**`) y deja pasar todo lo demás. Si una pantalla necesita datos, el 401/403
  llega en la llamada a `/api`, nunca al cargar la página — el guard de rutas es cosa del
  cliente, el backend siempre te va a servir el HTML.
- **401 ≠ 403**, y el interceptor de `client.ts` depende de esa diferencia: **401** es "no hay
  sesión" (sin token o caducado) → lanza el toast y limpia el store; **403** es `@PreAuthorize`
  diciendo que el recurso es de otro usuario, con la sesión perfectamente válida → se muestra
  el error, **nunca se desloguea**. El 401 lo devuelve el `authenticationEntryPoint` del
  backend; el default de Spring Security habría sido 403 para ambos casos.
- **El interceptor no navega, solo limpia la sesión.** La redirección la hace `ProtectedRoute`,
  que está suscrito al store: token a null → `<Navigate to="/login">`. Es a propósito y no se
  puede volver a un `window.location`: recargar la página se llevaría por delante el toast que
  se acaba de lanzar, que es justo lo que le explica al usuario por qué está otra vez en el
  login. **El JWT dura 30 minutos y no hay refresh token**, así que este camino se recorre en
  cada sesión larga; no es un caso raro.

## Auth: dos rarezas del backend que condicionan el cliente

- **`POST /api/auth/login` devuelve solo `{ token }`**, sin objeto usuario, y no hay ningún
  `/api/users/me`. Por eso `AuthUser` (id, username, role) sale de decodificar los claims del
  propio JWT (`sub`, `userId`, `role`, `exp`) en `store/authStore.ts`. Eso es para pintar UI y
  decidir rutas, **nunca** una decisión de seguridad: el payload de un JWT se lee sin verificar
  la firma, y quien autoriza es el backend.
- **`POST /api/auth/register` devuelve un `UserResponse` con 201, no un token.** Para dejar la
  sesión iniciada hay que llamar después a `/login` con las mismas credenciales; eso es lo que
  hace `useRegister()` en su `mutationFn`. Ojo también: el controller recibe un `UserRequest`,
  no el `RegisterRequest` que existe sin usar en `dto/auth`.
- **`authStore.login(token)` recibe el token, no las credenciales.** El HTTP es del hook de
  TanStack Query; el store solo guarda sesión. Así no depende del cliente de la API ni duplica
  estados de carga que Query ya maneja.
- La validación de zod puede ser **más estricta** que la del backend (email obligatorio pese a
  que `@Email` acepta null, mínimo de 8 en la contraseña de registro), nunca más laxa. En el
  **login** no hay reglas de longitud a propósito: quien ya tiene cuenta tiene la contraseña
  que tenga, y una política nueva le dejaría fuera.

## Endpoints que no tienen la forma que esperas

Comprueba el controller antes de dar por hecha una ruta REST; varias no siguen el patrón obvio:

- **`GET /api/accounts` devuelve las del usuario del token** y no lleva `@PreAuthorize` — no le
  hace falta, el id sale del principal y no de la petición, así que no hay nada cuya propiedad
  validar. `GET /api/accounts/users/{id}` sigue existiendo, pero es para ADMIN: es la única
  forma de listar las cuentas de otro. Desde el cliente usa siempre la primera.
- **`POST /api/accounts` solo acepta `{ name }`.** Toda cuenta nace con saldo 0; el saldo lo
  mueven las transacciones. No mandes un balance inicial, se ignora.
- **`DELETE /api/accounts/{id}` da 409 si la cuenta tiene movimientos**, con un mensaje en inglés
  y con el UUID dentro. Ese texto no se le enseña al usuario: se traduce en el hook.
- **No hay `GET /api/transactions`**, a diferencia de las cuentas: el listado es
  `GET /api/transactions/users/{id}`, con el id sacado de la sesión. Viene ordenado de más
  reciente a más antiguo desde la query — no lo reordenes en el cliente.
- **`POST /api/transactions` no acepta fecha.** La pone el servidor con `LocalDateTime.now()`,
  así que no se pueden dar de alta movimientos con fecha pasada. Si algún día hace falta, es un
  campo nuevo en `TransactionRequest`, no algo que se arregle desde aquí.
- **Un gasto mayor que el saldo da 409** (`InsufficientBalanceException`), con el mensaje en
  inglés. Se traduce en el hook.
- **Crear o borrar un movimiento cambia el saldo de la cuenta**, así que las mutaciones
  invalidan `['transactions']` **y** `['accounts']`. Si se olvida la segunda, las tarjetas de
  cuentas se quedan con el saldo viejo.
- **La proyección de metas (`GET /api/goals/{id}/projection`) tiene su propia semántica**, y
  pintarla sin entenderla da un gráfico que miente. Lo que hay que saber (está todo cubierto por
  `SavingsGoalServiceImplProjectionTest`, 16 casos):
  - Los tres escenarios salen de **un solo ritmo**: optimista = `averageMonthlyNet +
    monthlyNetStdDeviation`, realista = la media, pesimista = media − desviación. Con ahorro
    constante la desviación es 0 y **las tres líneas se solapan**: no es un bug del gráfico.
  - `monthlyBreakdown` son 24 puntos que empiezan en el **mes siguiente** al actual. El saldo de
    hoy no viene como punto: hay que reconstruir el mes 0 restando un mes al primero y usando
    `currentBalance`.
  - Un **ETA a null** significa "a ese ritmo no se alcanza": ritmo ≤ 0, o más de 1200 meses. No
    es lo mismo que "no se ve en el gráfico" — un ETA puede existir y caer fuera de los 24 meses
    dibujados, y eso hay que decirlo aparte.
  - La media son los **6 meses cerrados** anteriores; el mes en curso se excluye a propósito
    (llevaría solo unos días y hundiría la media). Los meses sin movimientos cuentan como 0.
  - `onTrackForTargetDate` tiene tres estados y los tres significan cosas distintas: `true` va a
    tiempo, `false` no llega, **`null` es que la meta no tiene fecha límite**. No lo trates como
    un booleano.
- **Los cuatro informes de `/api/reports/*` no miden lo que parece por el nombre.** Ninguno lleva
  el id del usuario: sale del principal.
  - `from`/`to` son `yyyy-MM-dd`, **inclusivos los dos** (el día final llega hasta `LocalTime.MAX`)
    y opcionales: si faltan, el backend aplica los últimos 6 meses hasta hoy. `from > to` es un
    **400** (`InvalidDateRangeException`), así que el cliente no debería ni lanzar la petición
    mientras el rango esté invertido.
  - `GET /reports/cashFlow` devuelve **un punto por movimiento**, no por día, y el `balance` de
    cada punto es el acumulado **dentro del rango, empezando en cero**. No es el saldo de las
    cuentas: mide cuánto ha subido o bajado el dinero durante el periodo. Etiquetarlo como
    "saldo" es la forma fácil de mentir con este endpoint.
  - `GET /reports/category` es **solo gastos**, ordenado de mayor a menor por la query. Lo era a
    medias: usaba `findByCategory`, que suma ingresos y gastos en el mismo total, así que una
    categoría con nómina y compras devolvía la resta. Ahora usa `findExpensesByCategory`.
    `category` puede venir **null** (es texto libre en la entidad).
  - `GET /reports/monthly?year=` **no acepta rango**, solo el año, y devuelve **solo los meses con
    movimientos**: los huecos se rellenan en el cliente o el eje miente sobre el hueco.
- **No hay divisa en ninguna parte del backend.** Los importes son `BigDecimal` pelados. El euro
  es una decisión de presentación que vive en `utils/format.ts`, único sitio que hay que tocar si
  algún día la cuenta lleva su moneda.

## Estructura

```
frontend/
├── src/
│   ├── api/          # cliente axios + funciones de fetch por dominio
│   ├── components/   # componentes reutilizables (charts, forms, layout)
│   ├── pages/         # una carpeta/archivo por ruta
│   ├── hooks/          # hooks de TanStack Query
│   ├── store/           # Zustand (authStore y toastStore, nada más)
│   ├── types/             # interfaces TS que espejan los DTOs del backend
│   └── utils/              # formateo de presentación (dinero, fechas)
├── vite.config.ts
└── package.json
```

## Rutas

Públicas `/login` y `/register`; privadas `/dashboard`, `/accounts`, `/transactions` y `/goals`,
todas bajo `<ProtectedRoute>` (guard) y dentro de `<AppLayout>` (cabecera común). `/` redirige a
`/dashboard` y `*` cae en `NotFoundPage` — el 404 lo decide el cliente, porque el backend
responde `index.html` a cualquier ruta sin extensión que no cuelgue de `/api`.

`ProtectedRoute` guarda en el state del historial la ruta de la que rebotó al usuario, y
`LoginPage` lo devuelve ahí al entrar. Ese destino pasa por `safeRedirect()`, que exige una ruta
interna: sin ese filtro un `//evil.com` convertiría el login en un redirector abierto.

El guard **solo protege lo que se ve, no los datos**. La única barrera real es el 401 del
backend; nunca escondas algo en el cliente asumiendo que eso lo protege.

## Convenciones

- Un hook de TanStack Query por recurso (`useAccounts`, `useTransactions`,
  `useSavingsGoals`, `useSavingsGoalProjection`), nunca fetch/axios directo en un
  componente de página.
- Query keys consistentes: `['accounts']`, `['goals', goalId, 'projection']`,
  `['reports', <informe>, from, to]`. **El rango va dentro de la clave**: así cambiar de periodo
  es una consulta nueva y TanStack la lanza sola, sin que nadie tenga que invalidar nada a mano.
  Los informes usan `placeholderData: keepPreviousData` para que el dashboard no parpadee ni pegue
  un salto de altura al cambiar de periodo.
- Crear o borrar un movimiento invalida también la rama `['reports']` entera, sin mirar el rango:
  desde el hook no se sabe qué periodos hay cacheados y el movimiento nuevo entra en cualquiera
  que lo contenga.
- Formularios: react-hook-form + zod, replicando la validación del backend
  (`targetAmount > 0`, campos requeridos).
- Los campos `BigDecimal` del backend llegan como `number`. Mostralos directo; **no
  sumes/restes montos acumulativamente en el cliente** — si falta un total, pedilo al
  backend.
- Errores: siguen el formato `ErrorResponse` del backend (`message`, `status`,
  `timestamp`, `path`) — un único interceptor de Axios los traduce a toast.

## Diseño visual — evita el "look de IA genérico"

Antes de construir cualquier pantalla nueva, especialmente el dashboard, no caigas en
los tres defaults que salen sin pensar:

1. Fondo crema + acento terracota
2. Fondo negro con un solo acento verde ácido o vermellón
3. Layout tipo periódico, esquinas cuadradas, reglas finas por todos lados

Ninguno está prohibido si de verdad encaja, pero no deben salir por default. Antes de
escribir CSS, definí un token system propio para esta app:

- **Color**: 4-6 hex nombrados, pensados para "control sobre el dinero", no el
  verde-billete genérico de cualquier fintech
- **Tipografía**: display + body propios del proyecto, más una utility face para
  números en tablas y gráficos — es una app donde el usuario mira cifras todo el tiempo
- **Layout**: bocetá en ASCII antes de codear, sobre todo el dashboard por la cantidad
  de gráficos que conviven en una pantalla
- **Elemento de firma**: candidato natural es cómo se resuelve visualmente el gráfico
  de proyección de ahorro (3 escenarios), no un adorno suelto

No negociable sin importar la dirección visual: responsive hasta mobile, foco de
teclado visible, respeta `prefers-reduced-motion`, gastá la audacia visual en un solo
lugar y dejá todo lo demás disciplinado.

## Gráficos y dashboard

Los colores de los gráficos están en `components/charts/palette.ts` y **no se eligen a ojo**: la
lista se pasó por un validador de contraste y de daltonismo contra el blanco de las tarjetas. Dos
consecuencias que hay que respetar al tocarlos:

- **El orden de `CATEGORY_COLORS` es el mecanismo de seguridad, no decoración.** Lo que se valida
  son los pares adyacentes, que en el donut son justo las porciones vecinas. Reordenar o añadir un
  séptimo tono invalida la comprobación: la cola larga se agrupa en «Otras» (gris, que no es un
  color de la escala) y el donut nunca pasa de 6 porciones.
- **Ingreso y gasto no son verde y rojo cualesquiera.** El par obvio (`emerald-700`/`rose-700`)
  queda a ΔE 6.0 con deuteranopia, o sea indistinguible para quien no separa el rojo del verde.
  Los de `palette.ts` se separan además en claridad, que es el canal que sobrevive al daltonismo.
- Tres tonos de la escala no llegan a 3:1 contra el blanco, así que **ningún gráfico puede
  apoyarse solo en el color**: leyenda con el importe escrito, o tabla al lado.

Otras reglas que ya siguen los cuatro gráficos: rejilla continua y sin verticales (una punteada
compite con las series de la proyección, que sí lo son a propósito), animación apagada con
`useReducedMotion`, y la zona sensible al click es la columna entera del mes, no la barra.

El **periodo del dashboard vive en `DashboardPage`**, no en `PeriodSelector`, y lo comparten todos
los informes de la página menos el gráfico anual, que tiene su propio selector de año. No metas un
selector de rango dentro de una tarjeta: dos gráficos contiguos con periodos distintos es
imposible de detectar mirándolos.

El **filtro de `/transactions` va en la query string** (`?from=&to=&category=`) y no en un estado
local: así el enlace desde el gráfico mensual llega filtrado, se puede compartir y el botón de
atrás lo deshace. Se aplica en el cliente sobre la lista completa porque **la API no ofrece
movimientos por rango**; el día que exista ese endpoint, se sustituye el filtrado sin tocar la
URL, que es la que manda.

La **paginación también es del cliente** (`usePagination` + `components/ui/Pagination`), por lo
mismo: `GET /api/transactions/users/{id}` devuelve el histórico entero de una vez y no acepta ni
página ni rango. O sea que **no ahorra red, ahorra tabla** — la petición sigue trayéndolo todo.
El día que el backend pagine, el hook se cambia por parámetros de la petición y las pantallas no
se enteran. `usePagination` recibe una `resetKey` (la query string, el periodo + la categoría):
sin ella, filtrar estando en la página 5 deja una tabla vacía que parece "no hay resultados".

## Comandos

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173 (o el puerto que asigne Vite), con proxy a :8080
pnpm build         # compila a ../src/main/resources/static
pnpm lint
```

Antes de dar por terminada una tarea que toque el frontend: `pnpm build`, y si es
razonable, un `./mvnw package` desde la raíz para confirmar que el jar final incluye el
build actualizado.

**El build de Maven ya compila el frontend solo**: `frontend-maven-plugin` corre
`pnpm install --frozen-lockfile` + `pnpm build` en `generate-resources`, con su propio
Node/pnpm descargado en `frontend/node/` (versiones fijadas en el `pom.xml`, no las del
PATH). Dos consecuencias:

- `src/main/resources/static/` es artefacto de build y está en `.gitignore`. No lo
  edites ni lo commitees.
- Si cambias `package.json` sin actualizar `pnpm-lock.yaml`, el build de Maven **falla**
  (`--frozen-lockfile`). Instala siempre con `pnpm add`, que actualiza el lockfile, y
  commitea el lockfile.
- Para iterar solo en backend: `./mvnw test -Dfrontend.skip=true`.

## Qué NO hacer

- No uses `npm` ni `yarn` — siempre `pnpm`. Si ves un `package-lock.json` o `yarn.lock`
  en `frontend/`, es un error, bórralo.
- No hagas fetch directo en componentes — siempre vía un hook de TanStack Query.
- No guardes estado de servidor en Zustand — solo auth y avisos efímeros (`toastStore`) van
  ahí. El toast está en Zustand y no en un contexto porque quien más lo necesita es el
  interceptor de Axios, que vive fuera del árbol de React y no puede usar hooks. **No hay
  librería de toasts**: son ~40 líneas propias (`store/toastStore.ts` +
  `components/feedback/Toaster.tsx`) para no meter una dependencia sin preguntar.
- No uses una URL absoluta ni una variable de entorno de host para la API — es `/api`
  relativo, funciona igual en dev (proxy) y prod (mismo origen).
- No asumas que las rutas profundas de React Router funcionan sin verificar que el
  fallback de SPA existe en el backend.
- No sumes montos `BigDecimal`-como-`number` en el cliente para totales nuevos. La única
  excepción es el avance de las metas en el dashboard, que suma los saldos de las cuentas: la
  alternativa era pedir la proyección completa de cada meta (una petición por meta, con 24 puntos
  de serie que allí no se pintan) para leer un solo número. Ojo con lo que significa ese número:
  el ahorro es **común a todas las metas**, no hay una hucha por meta, así que dos metas de 1.000 €
  con 1.000 € en las cuentas salen las dos al 100 %.
- No uses el primer default visual que se te ocurra para el dashboard.

## Plan de trabajo activo

Sigue el orden de `frontend-prompts.md` (raíz del repo): bloque 0 (rango de fechas +
fallback de SPA en el backend) antes que nada, después scaffold con pnpm, auth, CRUD,
metas de ahorro, y dashboard al final.
