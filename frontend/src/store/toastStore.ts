import { create } from 'zustand'

export type ToastVariant = 'error' | 'info' | 'success'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

const DISMISS_AFTER_MS = 6000

let nextId = 0

/**
 * Avisos efimeros. Vive en Zustand y no en un contexto de React porque quien mas los necesita es
 * el interceptor de Axios, que esta fuera del arbol de componentes y no puede usar hooks.
 */
interface ToastState {
  toasts: Toast[]
  push: (message: string, variant?: ToastVariant) => void
  dismiss: (id: number) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (message, variant = 'info') => {
    // Varias peticiones en paralelo caducan a la vez y darian el mismo aviso N veces. Si ya
    // esta en pantalla, no se repite.
    if (get().toasts.some((toast) => toast.message === message)) {
      return
    }

    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }))
    setTimeout(() => get().dismiss(id), DISMISS_AFTER_MS)
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

/** Atajo para lanzar un aviso fuera de React (interceptores, callbacks sueltos). */
export const showToast = (message: string, variant: ToastVariant = 'info') =>
  useToastStore.getState().push(message, variant)
