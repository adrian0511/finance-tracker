package com.adrian.financetracker_monolith_api.dto.goal;

import java.math.BigDecimal;
import java.time.YearMonth;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Neto (ingresos menos gastos) de un mes, tal y como lo agrega la base de datos. No se expone
 * por la API: es la materia prima de la proyeccion de metas, por eso year/month vienen sueltos
 * (JPQL solo sabe devolver YEAR() y MONTH() por separado) y se recomponen con {@link #month()}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyNet {

    private Integer year;
    private Integer month;
    private BigDecimal net;

    public YearMonth month() {
        return YearMonth.of(year, month);
    }
}
