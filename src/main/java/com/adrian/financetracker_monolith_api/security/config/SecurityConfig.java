package com.adrian.financetracker_monolith_api.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.adrian.financetracker_monolith_api.security.filter.JwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

@EnableWebSecurity
@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter authenticationFilter;
    private  final AuthenticationProvider authenticationProvider;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) {
        return http
                .csrf(CsrfConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider)
                .authorizeHttpRequests(authz -> authz
                        .requestMatchers("/api/auth/**")
                        .permitAll()
                        // La API sigue siendo default-deny: lo que cuelga de /api pide token.
                        .requestMatchers("/api/**")
                        .authenticated()
                        // Todo lo demas es el shell del SPA (index.html, los assets de Vite y las
                        // rutas de React Router, que acaban en index.html via SpaForwardingController).
                        // Tiene que servirse sin token: el navegador pide estas URLs sin cabecera
                        // Authorization, y sin el HTML no hay nada que pueda mandar el token luego.
                        .anyRequest().permitAll())
                // Sin esto Spring Security usa Http403ForbiddenEntryPoint y responde 403 tanto
                // al que no ha mandado token como al que intenta tocar un recurso ajeno. Son dos
                // casos distintos y el cliente tiene que poder separarlos: 401 es "no hay sesion"
                // y se responde deslogueando y mandando al login; 403 es "esto no es tuyo" y ahi
                // borrarle el token al usuario seria un error.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .addFilterBefore(authenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

}
