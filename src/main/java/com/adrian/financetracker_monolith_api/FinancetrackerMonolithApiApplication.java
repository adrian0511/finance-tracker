package com.adrian.financetracker_monolith_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class FinancetrackerMonolithApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(FinancetrackerMonolithApiApplication.class, args);
	}

}
