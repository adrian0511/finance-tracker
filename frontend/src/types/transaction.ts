import type { IsoDateTime, Money, TransactionType, Uuid } from './common'

/**
 * Espeja {@code dto/transaction/TransactionResponse}.
 *
 * La transaccion no lleva userId: el modelo es User -> Account -> Transaction, y al usuario se
 * llega por la cuenta. {@code category} es libre y puede venir a null.
 */
export interface TransactionResponse {
  id: Uuid
  amount: Money
  category: string | null
  accountId: Uuid
  type: TransactionType
  date: IsoDateTime
}

/**
 * Espeja {@code dto/transaction/TransactionRequest}. **No lleva fecha**: la pone el servidor con
 * {@code LocalDateTime.now()} al crear, asi que no se pueden dar de alta movimientos con fecha
 * pasada por aqui.
 */
export interface TransactionRequest {
  amount: Money
  type: TransactionType
  category: string
  accountId: Uuid
}
