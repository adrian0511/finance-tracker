package com.adrian.financetracker_monolith_api.exception.account;

public class AccountHasTransactionsException extends RuntimeException {

    public AccountHasTransactionsException(String message) {
        super(message);
    }

}
