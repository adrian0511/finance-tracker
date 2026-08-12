package com.adrian.financetracker_monolith_api.security.jwt;

import java.security.Key;
import java.util.Date;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Header;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String SECRET_KEY;

    @Value("${jwt.expiration}")
    private Long EXPIRATION_MINUTES;

    public String generateToken(String username, Map<String, Object> claims) {
        Date issuedAt = new Date(System.currentTimeMillis());
        Date expiration = new Date(issuedAt.getTime() + (EXPIRATION_MINUTES * 60 * 1000));

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(issuedAt)
                .setExpiration(expiration)
                .setHeaderParam(Header.TYPE, Header.JWT_TYPE)
                .signWith(generateKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String jwt) {
        return extractAllClaims(jwt).getSubject();
    }

    private Claims extractAllClaims(String jwt) {
        return Jwts.parser().setSigningKey(generateKey()).build()
                .parseClaimsJws(jwt).getBody();
    }

    /**
     * Cualquier problema con el token acaba en false: caducado, firmado con otra clave, o
     * directamente ilegible. Para quien llama da igual, pero para diagnosticar no: un token
     * caducado es rutina y uno mal firmado no lo es, y sin el log los dos eran el mismo silencio.
     *
     * Se registra el tipo de excepcion y su mensaje, <b>nunca el token</b>: es una credencial en
     * vigor y quien lea el log podria usarlo.
     */
    public boolean validateToken(String jwt) {
        try {
            boolean valid = !extractExpiration(jwt).before(new Date(System.currentTimeMillis()));

            if (!valid) {
                log.debug("Token caducado");
            }

            return valid;
        } catch (Exception e) {
            log.debug("Token rechazado: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            return false;
        }
    }

    public Date extractExpiration(String token) {
        return extractAllClaims(token).getExpiration();
    }

    private Key generateKey() {
        byte[] secretAsBytes = Decoders.BASE64.decode(SECRET_KEY);
        return Keys.hmacShaKeyFor(secretAsBytes);
    }

}
