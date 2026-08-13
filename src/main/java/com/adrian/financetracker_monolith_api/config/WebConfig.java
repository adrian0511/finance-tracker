package com.adrian.financetracker_monolith_api.config;

import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Cachea los assets de Vite un año, y <b>solo</b> los assets.
 *
 * Se puede porque Vite les pone el hash del contenido en el nombre
 * ({@code index-5cNAzjaM.js}): si el archivo cambia, cambia la URL, asi que una copia guardada
 * nunca puede quedarse vieja.
 *
 * Va aqui y no en {@code spring.web.resources.cache} del yaml porque esa propiedad se aplica a
 * <b>todos</b> los recursos estaticos, {@code index.html} incluido — y eso es justo lo que no
 * puede pasar. Ese HTML es quien apunta a los nombres con hash: si el navegador se lo guarda un
 * año, seguiria pidiendo los assets de la version vieja despues de cada despliegue y la
 * aplicacion se quedaria congelada. Sin regla propia, {@code index.html} conserva el
 * {@code no-store} que le pone Spring Security, que es lo correcto para el.
 *
 * Ese detalle importa tambien al reves: Spring Security solo escribe su Cache-Control si la
 * respuesta no trae uno, asi que declararlo aqui es lo que hace que gane este y no el suyo.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final Duration ONE_YEAR = Duration.ofDays(365);

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCacheControl(CacheControl.maxAge(ONE_YEAR).cachePublic().immutable());
    }

}
