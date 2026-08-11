import { api } from './client'
import type { AccountResponse } from '@/types/account'
import type { Uuid } from '@/types/common'

/** Las del usuario del token: el backend saca el id del principal, no hay que mandarlo. */
export async function listAccounts(): Promise<AccountResponse[]> {
  const { data } = await api.get<AccountResponse[]>('/accounts')
  return data
}

/** El backend solo acepta el nombre: toda cuenta nueva empieza con balance 0. */
export async function createAccount(name: string): Promise<AccountResponse> {
  const { data } = await api.post<AccountResponse>('/accounts', { name })
  return data
}

export async function deleteAccount(id: Uuid): Promise<void> {
  await api.delete(`/accounts/${id}`)
}
