package com.adrian.financetracker_monolith_api.exception.account;

public class InsufficientBalanceException extends RuntimeException {

    public InsufficientBalanceException(String message) {
        super(message);
    }

}
