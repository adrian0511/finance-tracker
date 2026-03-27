# 💼🤖 FinanceTracker Monolith-API

Sistema de Contabilidad Inteligente con Spring Boot + IA

---

## 🚀 Descripción

FinanceTracker Monolith-API es una API REST desarrollada con Spring Boot que permite gestionar finanzas personales de
forma segura,
eficiente y potenciada por Inteligencia Artificial.

- 📊 Gestión de ingresos y gastos
- 🏦 Manejo de múltiples cuentas
- 📈 Reportes financieros dinámicos
- 🤖 Integración con IA para análisis automático
- 🔐 Seguridad con JWT
- 🧠 Arquitectura limpia y escalable

---

## 🎯 Objetivo

Construir un backend profesional que simule un sistema financiero real, aplicando:

- Buenas prácticas de desarrollo backend
- Seguridad y control de acceso
- Modelado correcto de dominio
- Integración de IA en lógica de negocio

---

## 🛠️ Tecnologías Utilizadas

- Java 21
- Spring Boot 4.0.4
- Spring Data JPA
- PostgreSQL
- Lombok
- Spring Security
- Prompt-Link (IA)

---

## 🧠 Características principales

### 💰 Gestión financiera

- Crear cuentas (banco, efectivo, etc.)
- Registrar ingresos y gastos
- Balance automático por cuenta

### 📊 Reportes inteligentes

- Reportes mensuales y anuales
- Filtros por fecha
- Balance, ingresos y gastos agregados

### 🤖 Inteligencia Artificial integrada

- Análisis financiero automático
- Recomendaciones personalizadas
- Clasificación de gastos
- Asistente tipo chat financiero

### 🔐 Seguridad

- Autenticación con JWT
- Acceso basado en usuario autenticado
- Privacidad total: cada usuario ve solo sus datos

---

### 🧱 Arquitectura

``` markdown
src/main/java/com/financetracker/

│
├── controller/     # Endpoints REST
├── service/        # Lógica de negocio
├── repository/     # Acceso a datos
├── entity/         # Modelos JPA
├── dto/            # Requests y Responses
├── mapper/         # MapStruct
├── security/       # JWT y configuración
├── exception/      # Excepciones personalizadas
├── util/           # Enumeraciones de Role y Type
└── handler/        # Control de las excepciones con @RestControllerAdvice

```

---

### 🔄 Modelo de dominio

Usuario → Cuenta → Transacción

- Un usuario tiene múltiples cuentas
- Una cuenta tiene múltiples transacciones
- Las transacciones NO conocen directamente al usuario (diseño limpio)

---

### 🔐 Autenticación

La API utiliza JWT para proteger endpoints.

Authorization: Bearer <token>

---

### 🌐 Endpoints principales

#### 👤 Auth

- "POST /api/auth/register"
- "POST /api/auth/login"

---

#### 🏦 Cuentas

- "GET /api/accounts/users/{id}"
- "POST /api/accounts"
- "DELETE /api/accounts/{id}"

---

#### 💸 Transacciones

- "GET /api/transactions/users/{id}"
- "POST /api/transactions"

---

#### 📊 Reportes

- "GET /api/reports/mensual?year=2025&month=3"

  ✔ "year" obligatorio

---

#### 🤖 IA

- "GET /api/ai/analysis"
- "POST /api/ai/chat"
- "POST /api/ai/categorize"

---

#### 🤖 Ejemplo de uso de IA

``` java 
@Autowired
private AiService aiService;

String response = aiService.generate(
    "Analiza mis gastos y dame recomendaciones")
    .getContent();
```

---

### ⚙️ Configuración

``` yaml
# Base de datos

spring:
    datasource:
        url: jdbc:postgresql://localhost:5432/finance

# JWT

jwt:
    secret: secret
    expiration: 30

# IA

ai:
    api-key: YOUR_API_KEY

```

---

## 🚀 Cómo ejecutar

``` bash
# Clonar repositorio
git clone https://github.com/adrian0511/finance-tracker.git

# Entrar al proyecto
cd finance-tracker

# Ejecutar
./mvnw spring-boot:run
```

---

## 🧑‍💻 Autor

Desarrollado por Adrián Garcés

---

## ⭐ Contribuciones

Las contribuciones son bienvenidas.
Si te gusta el proyecto, dale una ⭐.

---