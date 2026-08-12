import { api } from './client'
import type { Uuid } from '@/types/common'
import type { SavingsGoalResponse, SavingsProjectionResponse } from '@/types/goal'

export interface SavingsGoalRequest {
  name: string
  targetAmount: number
  /** Opcional: una meta puede no tener fecha limite. */
  targetDate?: string
}

/** Como las cuentas, el backend saca el usuario del principal: no hay que mandar el id. */
export async function listGoals(): Promise<SavingsGoalResponse[]> {
  const { data } = await api.get<SavingsGoalResponse[]>('/goals')
  return data
}

export async function createGoal(request: SavingsGoalRequest): Promise<SavingsGoalResponse> {
  const { data } = await api.post<SavingsGoalResponse>('/goals', request)
  return data
}

export async function deleteGoal(id: Uuid): Promise<void> {
  await api.delete(`/goals/${id}`)
}

/** Una meta de otro usuario responde 404, no 403, para no revelar que ese UUID existe. */
export async function getProjection(id: Uuid): Promise<SavingsProjectionResponse> {
  const { data } = await api.get<SavingsProjectionResponse>(`/goals/${id}/projection`)
  return data
}
