package com.adrian.financetracker_monolith_api.dto.ai;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIResponse {

    private String response;
    private LocalDateTime timestamp;

}
