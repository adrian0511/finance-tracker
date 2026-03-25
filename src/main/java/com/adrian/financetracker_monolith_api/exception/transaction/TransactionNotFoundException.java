package com.adrian.financetracker_monolith_api.exception.transaction;

public class TransactionNotFoundException extends RuntimeException {

    public TransactionNotFoundException(String message) {
        super(message);
    }

}
