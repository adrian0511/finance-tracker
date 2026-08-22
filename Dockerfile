# Build en dos etapas: la primera necesita el JDK entero y se baja medio Maven Central; la que se
# publica solo lleva el jar y un JRE.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# El wrapper y el pom van primero y solos: mientras no cambien, Docker reutiliza la capa de
# dependencias y no vuelve a descargarlas en cada build.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# El frontend antes que el codigo Java: asi editar un controller no invalida esta capa y el build
# reutiliza el pnpm install. frontend-maven-plugin se baja su propio Node y pnpm en frontend/node.
COPY frontend frontend

COPY src src

# Sin tests: los de contexto necesitan un Postgres levantado y aqui no hay ninguno. La suite se
# corre fuera de la imagen (./mvnw test), no durante el build.
RUN ./mvnw package -B -DskipTests

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Usuario sin privilegios: si alguien se escapa del proceso, no lo hace como root.
RUN groupadd --system spring && useradd --system --gid spring spring

COPY --from=build --chown=spring:spring /build/target/*.jar app.jar
USER spring

EXPOSE 8080

# El contenedor no lleva .env; API_KEY y el resto entran como variables de entorno, que ademas
# tienen prioridad sobre el archivo (ver spring-dotenv en CLAUDE.md).
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
