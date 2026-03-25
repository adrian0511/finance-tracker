package com.adrian.financetracker_monolith_api.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.adrian.financetracker_monolith_api.dto.transaction.TransactionResponse;
import com.adrian.financetracker_monolith_api.entity.Transaction;

@Mapper(componentModel = "spring")
public interface TransactionMapper {

    @Mapping(target = "accountId", source = "account.id")
    TransactionResponse toResponse(Transaction transaction);

}
