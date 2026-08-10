package com.adrian.financetracker_monolith_api.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    /**
     * Reloj de la aplicacion. Los servicios que dependen de la fecha lo reciben por constructor
     * en vez de llamar a now() directamente, para que en los tests se pueda sustituir por un
     * Clock.fixed y el resultado deje de depender del dia en que se ejecuten.
     */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }

}
