package com.adrian.financetracker_monolith_api.config;

import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Cachea los assets de Vite un año, y <b>solo</b> los assets: llevan el hash del contenido en el
 * nombre, asi que una copia guardada nunca se queda vieja.
 *
 * Va aqui y no en {@code spring.web.resources.cache} porque esa propiedad alcanza tambien a
 * {@code index.html}, que es quien apunta a los nombres con hash: cachearlo dejaria la aplicacion
 * congelada en la version anterior despues de cada despliegue. Sin regla propia conserva el
 * {@code no-store} de Spring Security, que solo escribe el suyo si la respuesta no trae uno.
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
