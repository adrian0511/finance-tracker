package com.adrian.financetracker_monolith_api.security.filter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import com.adrian.financetracker_monolith_api.security.userdetails.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.adrian.financetracker_monolith_api.entity.User;
import com.adrian.financetracker_monolith_api.security.jwt.JwtService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.split(" ")[1];

        if (jwtService.validateToken(jwt)) {

            String username = jwtService.extractUsername(jwt);
            CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(username);

            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null,userDetails.getAuthorities());

            SecurityContextHolder.getContext().setAuthentication(authToken);

            // Deja ver el coste que tiene esta recarga: el usuario se lee de la base de datos en
            // cada peticion, no del token. Es lo que hace que un cambio de rol surta efecto sin
            // volver a entrar, y a la vez un viaje a la base por peticion autenticada.
            log.debug("Autenticado {} ({}) para {} {}", username, userDetails.getId(),
                    request.getMethod(), request.getRequestURI());
        } else {
            // Un token invalido no corta la cadena: la peticion sigue sin autenticar y acabara en
            // 401 por el entryPoint. Sin esta linea, ese 401 no tenia explicacion en ningun sitio.
            log.debug("Peticion a {} {} con un token no valido: sigue sin autenticar",
                    request.getMethod(), request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }

}
