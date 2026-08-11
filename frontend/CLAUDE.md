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

## Estructura

```
frontend/
├── src/
│   ├── api/          # cliente axios + funciones de fetch por dominio
│   ├── components/   # componentes reutilizables (charts, forms, layout)
│   ├── pages/         # una carpeta/archivo por ruta
│   ├── hooks/          # hooks de TanStack Query
│   ├── store/           # Zustand (solo authStore)
│   └── types/             # interfaces TS que espejan los DTOs del backend
├── vite.config.ts
└── package.json
```

## Convenciones

- Un hook de TanStack Query por recurso (`useAccounts`, `useTransactions`,
  `useSavingsGoals`, `useSavingsGoalProjection`), nunca fetch/axios directo en un
  componente de página.
- Query keys consistentes: `['accounts']`, `['goals', goalId, 'projection']`.
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
- No guardes estado de servidor en Zustand — solo auth va ahí.
- No uses una URL absoluta ni una variable de entorno de host para la API — es `/api`
  relativo, funciona igual en dev (proxy) y prod (mismo origen).
- No asumas que las rutas profundas de React Router funcionan sin verificar que el
  fallback de SPA existe en el backend.
- No sumes montos `BigDecimal`-como-`number` en el cliente para totales nuevos.
- No uses el primer default visual que se te ocurra para el dashboard.

## Plan de trabajo activo

Sigue el orden de `frontend-prompts.md` (raíz del repo): bloque 0 (rango de fechas +
fallback de SPA en el backend) antes que nada, después scaffold con pnpm, auth, CRUD,
metas de ahorro, y dashboard al final.
