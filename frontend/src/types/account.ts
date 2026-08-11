import type { Money, Uuid } from './common'

/** Espeja {@code dto/account/AccountResponse}. */
export interface AccountResponse {
  id: Uuid
  balance: Money
  name: string
  userId: Uuid
}
