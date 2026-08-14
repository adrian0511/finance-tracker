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
├── scripts/
│   └── validate-palette.mjs  # `pnpm palette`: contraste + daltonismo
├── src/
│   ├── index.css     # el sistema de tokens: color, tipografía, tema claro/oscuro
│   ├── api/          # cliente axios + funciones de fetch por dominio
│   ├── components/   # componentes reutilizables (charts, forms, layout)
│   ├── pages/         # una carpeta/archivo por ruta
│   ├── hooks/          # hooks de TanStack Query, y useTheme
│   ├── store/           # Zustand (authStore y toastStore, nada más)
│   ├── types/             # interfaces TS que espejan los DTOs del backend
│   └── utils/              # presentación (dinero, fechas, periodo) y theme.ts
├── vite.config.ts
└── package.json
```

## Rutas

Públicas `/login` y `/register`; privadas `/dashboard`, `/accounts`, `/transactions`, `/goals`,
`/goals/:id` y `/chat`, todas bajo `<ProtectedRoute>` (guard) y dentro de `<AppLayout>` (cabecera
común). `/` redirige a `/dashboard` y `*` cae en `NotFoundPage` — el 404 lo decide el cliente,
porque el backend responde `index.html` a cualquier ruta sin extensión que no cuelgue de `/api`.

**Las nueve páginas se cargan con `lazy()`**, así que cada pantalla es su propio trozo y el
navegador no se baja el dashboard entero para enseñar el login. Hay **dos** `<Suspense>` y hacen
falta los dos: el de `App.tsx` cubre las rutas públicas, y el de `AppLayout` envuelve al `<Outlet>`
para que la cabecera no desaparezca mientras carga el trozo de la ruta siguiente.

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

## Diseño visual — el sistema de tokens

**Ya existe un sistema propio y vive en `src/index.css`.** No lo reinventes por pantalla y no
vuelvas a escribir clases `slate-*`, `emerald-*`, `red-*` ni ningún color literal de Tailwind: si
lo haces, esa pantalla se queda en claro cuando alguien ponga el tema oscuro. Todo color sale de
un token.

La dirección es **instrumento de medida**, no "app de banco": acero frío, un acento de acción y
un acento de firma. Es a propósito ninguno de los tres defaults que salen solos (crema +
terracota, negro con verde ácido, layout de periódico) y tampoco el verde-billete de cualquier
fintech.

**Los seis colores con nombre** de los que sale todo lo demás:

| nombre  | claro     | qué es                                                          |
| ------- | --------- | --------------------------------------------------------------- |
| tinta   | `#0d1520` | acero casi negro; texto en claro, lienzo en oscuro               |
| acero   | `#4a5c6f` | el gris azulado del que salen textos secundarios y bordes        |
| bruma   | `#e7ecf3` | fondos hundidos y separadores                                    |
| nácar   | `#eef1f6` | el lienzo de la página                                           |
| cobalto | `#1a66c2` | acción, foco, selección; es también el primer color de la escala de gráficos |
| latón   | `#8a5d0c` | **el acento de firma, y solo significa "meta"**                  |

**Latón = meta, en toda la app y en ningún otro sitio**: la línea del objetivo en la proyección y
la barra de una meta alcanzada. Ese es el único lugar donde se gasta audacia visual; si necesitas
destacar algo más, no es con latón.

**Tokens semánticos** (los que se usan como clases: `bg-superficie`, `text-tinta-suave`,
`border-borde-fuerte`, `bg-accion text-accion-tinta`, `bg-peligro text-peligro-tinta`,
`bg-alerta-tenue text-alerta`, …). Cada uno tiene valor en claro y en oscuro; la clase es la
misma y el tema la resuelve. `accion`/`peligro` van siempre con su `-tinta` correspondiente: en
oscuro el botón se da la vuelta (relleno claro, letra del lienzo) porque blanco sobre el cobalto
claro se queda en 2.4:1.

**Tres utilidades propias**, definidas también en `index.css`:

- `foco` — el anillo de foco de teclado, en un solo sitio. Sustituye a todas las cadenas
  `outline-none focus-visible:ring-*`. El color sale de `--anillo`, así que un campo inválido lo
  cambia con `aria-invalid:[--anillo:var(--alerta)]` sin repetir la sombra.
- `cifra` — la cara monoespaciada tabular. Va en **todo importe, fecha de tabla, eje y
  porcentaje**: es lo que hace que una columna de euros se lea como una columna.
- El tipo de letra de titulares (`font-display`) ya lo aplica `h1/h2/h3` en la capa base; no hace
  falta ponerlo a mano salvo en una cifra grande que quieras en esa cara.

**Las tres caras tipográficas son pilas del sistema, no fuentes descargadas** (`--font-display`,
`--font-texto`, `--font-cifra`). Es una decisión, no un pendiente: el jar se sirve entero desde el
mismo origen y meter una webfont significa o una petición a un CDN o binarios en el repo. Si algún
día se adopta una, se cambia la pila en `index.css` y no hay que tocar nada más.

No negociable sin importar la dirección visual: responsive hasta mobile, foco de teclado visible,
respeta `prefers-reduced-motion` (la capa base ya corta las transiciones), y todo lo que no sea el
elemento de firma se queda disciplinado.

## Tema claro y oscuro

- **Quién manda es la clase `dark` en `<html>`**, no `prefers-color-scheme`. La pone
  `src/utils/theme.ts`, y hay tres estados: `light`, `dark` y `system` — «sistema» **no** es un
  alias de claro, es seguir al SO y seguir haciéndolo si cambia con la página abierta.
- **El tema no está en Zustand.** En `store/` solo hay sesión y avisos. El tema lo guarda el DOM
  porque hay que aplicarlo antes del primer render; React se engancha con `useSyncExternalStore`
  (`hooks/useTheme.ts`). La instantánea lleva elegido **y** efectivo (`system:dark`): si fuera
  solo lo elegido, pasar el SO a modo noche no repintaría los gráficos.
- **Hay un script en línea en `index.html`** que aplica la clase antes de que cargue el bundle.
  Sin él, quien tiene el tema oscuro ve un fogonazo blanco en cada carga. Es la única copia de la
  clave de `localStorage` fuera de `theme.ts`, y tienen que decir lo mismo.
- `color-scheme` se pone junto con la clase: es lo que oscurece lo que pinta el navegador y no
  nuestro CSS — el calendario de un `<input type="date">`, el desplegable de un `<select>` y las
  barras de scroll.
- **Los gráficos no pueden usar variables CSS.** Los colores de Recharts acaban en atributos
  `fill`/`stroke` del SVG, así que se les dan ya resueltos con `useChartPalette()`, que devuelve
  la paleta del tema efectivo y vuelve a renderizar al cambiarlo.

## Gráficos y dashboard

Los colores de los gráficos están en `components/charts/palette.ts`, hay **dos paletas** (una por
tema) y **no se eligen a ojo**: `pnpm palette` (`scripts/validate-palette.mjs`) es lo que las
valida, y lee los colores de `index.css` y de `palette.ts` directamente, así que no puede
desincronizarse de lo que hay en pantalla. Comprueba contraste WCAG y distancia OKLab simulando
protanopia y deuteranopia. **Pásalo siempre que toques un color.** Reglas que salen de ahí:

- **El orden de `categorias` es el mecanismo de seguridad, no decoración.** Lo que se valida son
  los pares que se tocan, que en el donut son las porciones vecinas — y como el donut es un
  círculo, la última también toca a la primera. Se validan los dos anillos posibles: seis
  categorías, y cinco más «Otras» (gris, que no es un color de la escala). Reordenar o añadir un
  séptimo tono invalida la comprobación, y el donut nunca pasa de 6 porciones.
- **Hay dos paletas porque una no sirve para los dos temas**: el verde `#008300` que contrasta
  4.95:1 sobre la tarjeta blanca se queda en 1.6:1 sobre el acero oscuro. Los tonos oscuros
  conservan el tono del claro y suben de claridad, para que una categoría siga siendo "la naranja"
  al cambiar de tema.
- **Ingreso y gasto no son verde y rojo cualesquiera.** El par obvio (`emerald-700`/`rose-700`)
  queda a ΔE 6.0 con deuteranopia, o sea indistinguible para quien no separa el rojo del verde.
  Los de `palette.ts` se separan además en claridad, que es el canal que sobrevive al daltonismo.
- **El verde de un texto no es el verde de una barra.** Una mancha de color con significado se
  valida a 3:1 y un texto a 4.5:1, así que el ingreso de la escala de gráficos (`palette.ingreso`)
  no vale como color de letra: para texto y etiquetas están los tokens `exito`/`alerta`.
- Tres tonos de la escala clara no llegan a 3:1 contra el blanco, así que **ningún gráfico puede
  apoyarse solo en el color**: leyenda con el importe escrito, o tabla al lado.

**El elemento de firma es la banda de la proyección** (`ProjectionChart`), no un adorno. Tres
líneas sueltas cuentan el futuro como si fueran tres predicciones distintas, y no lo son: son un
ritmo y su margen. Por eso el hueco entre la pesimista y la optimista se pinta como una banda
rayada — rayada para que se lea como zona posible y no como un dato más — y las líneas van encima.
Cuando la desviación es 0 la banda se cierra sola y las tres líneas se solapan: eso es la lectura
correcta, no un fallo, y hay que seguir diciéndolo en texto al lado del gráfico. La banda solo se
dibuja con sus dos bordes visibles, y no entra ni en la leyenda ni en el tooltip porque sus dos
números son los que ya dan las líneas.

Otras reglas que ya siguen los cuatro gráficos: rejilla continua y sin verticales (una punteada
compite con las series de la proyección, que sí lo son a propósito), animación apagada con
`useReducedMotion`, y la zona sensible al click es la columna entera del mes, no la barra.

**`Panel` reserva el alto del contenido con `contentHeight`, y lo aplica a los cuatro estados**
(cargando, error, vacío, con datos). No es cosmético: sin eso la tarjeta mide dos líneas mientras
carga y varios cientos de píxeles al llegar la respuesta, y cada panel empuja a todos los de abajo
— era un CLS de 0,142 en el dashboard, que con esto baja a 0,011. Los tres altos de gráficos salen
del `height` que ya declara cada `ResponsiveContainer`, así que **si cambias el alto de un gráfico
hay que cambiarlo también en `ALTO`** de `DashboardPage`. El de la tabla se calcula a partir de
`PAGE_SIZE` en `RecentTransactions`.

**`AIInsightPanel` carga `AIMarkdown` con `lazy()` y lo precarga al pulsar «Generar».** Son 46 kB
de react-markdown que no pinta nada hasta que hay respuesta, y las dos tarjetas arrancan vacías. La
precarga en el click es lo que hace que el diferido no se note: mientras el modelo tarda sus
segundos, el trozo ya ha llegado. Si quitas el `warmMarkdown()` sigue funcionando, pero aparece un
parpadeo de «Dando formato…» justo al recibir el texto.

El **periodo del dashboard vive en `DashboardPage`**, no en `PeriodSelector`, y lo comparten todos
los informes de la página menos el gráfico anual, que tiene su propio selector de año. No metas un
selector de rango dentro de una tarjeta: dos gráficos contiguos con periodos distintos es
imposible de detectar mirándolos.

**El filtro de movimientos vive en `utils/transactionFilter.ts`** (el tipo, `matches`, la lectura
y escritura de la query string y las categorías disponibles) y su UI en
`components/transactions/TransactionFilters.tsx`. Las dos tablas lo comparten. Se aplica en el
cliente sobre la lista completa porque **la API no ofrece movimientos ni por rango ni por
categoría**; el día que exista ese endpoint se sustituye el filtrado y las pantallas no se enteran.

- **En `/transactions` el filtro va en la query string** (`?from=&to=&category=&type=`) y no en un
  estado local: así el enlace desde el gráfico mensual llega filtrado, se puede compartir y
  recargar no lo pierde. Se escribe con `replace` y no con `push`: son controles discretos que se
  toquetean varias veces seguidas, y con `push` salir de la pantalla obligaría a pulsar "atrás"
  una vez por cada movimiento del filtro.
- **`category` a null es "todas" y `category` a cadena vacía es "sin categoría"**, que son cosas
  distintas. En la URL se distinguen solas: no llevar el parámetro frente a `?category=`. La
  cadena vacía no colisiona con ninguna categoría real porque el alta exige nombre no vacío, y a
  la hora de comparar, `null` y `''` en el movimiento son lo mismo.
- **Los valores del `<select>` van prefijados** (`cat:<nombre>`). Sin prefijo, una categoría que se
  llamara "todas" sería indistinguible de la opción "Todas" — la categoría es texto libre.
- **Las categorías del desplegable salen de todos los movimientos, no de los visibles.** Si
  salieran de los visibles, elegir una dejaría el desplegable con esa sola opción y no habría
  forma de cambiar a otra.
- **En la tabla del dashboard el tipo es estado local** (es un ajuste de una tarjeta, no de la
  vista) y **el donut sigue siendo su filtro de categoría**. Como una porción del donut ya
  significa "gastos de esta categoría", mientras haya una elegida el control de tipo se queda
  bloqueado en Gastos: pulsar "Ingresos" daría siempre una tabla vacía sin explicar por qué.
- **Los controles se pintan siempre, también con la tabla vacía o en error** (por eso `Panel`
  tiene un `toolbar` aparte de `children`). Un filtro que desaparece con las filas que ha dejado
  fuera no se puede deshacer, y la tarjeta parece decir que no hay datos.

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
pnpm palette        # valida los colores (contraste + daltonismo) en los dos temas
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
- **No escribas un color literal de Tailwind (`bg-white`, `text-slate-600`, `border-red-500`) ni
  un hex suelto en un componente.** Todo sale de un token de `index.css`; un color literal se
  queda en claro cuando el usuario pone el tema oscuro. Si falta un token, se añade allí (con su
  valor en los dos temas) y se pasa `pnpm palette`.
- No pongas `outline-none focus-visible:ring-…` a mano: es la utilidad `foco`.
- No metas el tema en Zustand ni en un contexto de React: se aplica antes del primer render, así
  que lo guarda el DOM.

## Estado del cliente y qué viene después

El guion que traía esto hasta aquí (`frontend-prompts.md`) está terminado y el archivo ya no
está en el repo. Lo que hay hoy: login y registro, cuentas, movimientos (alta, borrado, filtro
por tipo y categoría, paginación), metas con su pantalla de detalle y proyección, dashboard con
periodo compartido y cuatro gráficos, y el sistema de tokens con tema claro/oscuro. Las rutas
están en la sección «Rutas».

**La IA está en tres sitios**, y ninguno se pide solo: las dos tarjetas del dashboard (análisis e
informe del mes, con su botón «Generar»), el botón «Sugerir categoría» del alta de movimientos, y
la pantalla `/chat`. Es a propósito — detrás hay un modelo gratuito con cuota compartida y esperas
de segundos, así que nada arranca una llamada al montar un componente. El historial del chat vive
en un `useState` local: el backend no lo persiste y se pierde al refrescar.

**Lo siguiente es presupuestos por categoría**, cuando exista `/api/budgets/*` en el backend —
mira la sección equivalente del `CLAUDE.md` raíz, que manda sobre el orden. Aquí eso será una
pantalla de presupuestos y, en el dashboard, lo gastado contra el tope.

Dos cosas que conviene saber antes de tocar nada:

- **No hay tests de frontend, ni runner instalado.** No hay vitest ni testing-library en el
  `package.json`: lo que sujeta el cliente son `pnpm lint`, `pnpm palette` y el `tsc -b` que
  lleva dentro `pnpm build`. Pásalos siempre. Si algún día se añaden tests, es una decisión de
  dependencias y se pregunta antes.
- **La interfaz no puede editar nada, porque la API tampoco.** No hay `PUT`/`PATCH` en el
  backend para movimientos, cuentas ni metas. Si echas en falta un botón de «editar», no es que
  se olvidara en la pantalla: falta el endpoint.
