package com.adrian.financetracker_monolith_api.exception.account;

public class AccountNotFoundException extends RuntimeException {

    public AccountNotFoundException(String message) {
        super(message);
    }

}
