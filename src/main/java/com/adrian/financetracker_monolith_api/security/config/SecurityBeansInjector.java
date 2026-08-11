package com.adrian.financetracker_monolith_api.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.adrian.financetracker_monolith_api.repository.UserRepository;
import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityBeansInjector {

    private final UserRepository repository;

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
            throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Lanza {@link UsernameNotFoundException} y no la excepcion propia del dominio a proposito:
     * es la unica que {@code DaoAuthenticationProvider} sabe tapar. Con
     * {@code hideUserNotFoundExceptions} (true por defecto) la convierte en un
     * {@code BadCredentialsException} indistinguible del de una contrasena mal puesta, asi que
     * el "ese usuario no existe" no llega a salir de aqui. Con una RuntimeException cualquiera
     * la envolvia en un InternalAuthenticationServiceException y su mensaje acababa en la
     * respuesta del login.
     */
    @Bean
    UserDetailsService userDetailsService() {
        return username -> repository.findByUsername(username)
                .map(CustomUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales invalidas"));
    }

}
