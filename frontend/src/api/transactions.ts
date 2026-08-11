import { api } from './client'
import type { Uuid } from '@/types/common'
import type { TransactionRequest, TransactionResponse } from '@/types/transaction'

/**
 * A diferencia de las cuentas, aqui no hay un GET /api/transactions: el listado cuelga del id del
 * usuario y el backend valida con @PreAuthorize que sea el suyo. Vienen ya ordenadas de mas
 * reciente a mas antigua desde la query.
 */
export async function listTransactions(userId: Uuid): Promise<TransactionResponse[]> {
  const { data } = await api.get<TransactionResponse[]>(`/transactions/users/${userId}`)
  return data
}

export async function createTransaction(request: TransactionRequest): Promise<TransactionResponse> {
  const { data } = await api.post<TransactionResponse>('/transactions', request)
  return data
}

export async function deleteTransaction(id: Uuid): Promise<void> {
  await api.delete(`/transactions/${id}`)
}
