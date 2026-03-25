package com.adrian.financetracker_monolith_api.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.adrian.financetracker_monolith_api.dto.account.AccountResponse;
import com.adrian.financetracker_monolith_api.entity.Account;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    @Mapping(target = "userId", source = "user.id")
    AccountResponse toResponse(Account account);

}
