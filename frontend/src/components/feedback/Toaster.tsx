import { useToastStore } from '@/store/toastStore'

const VARIANT_STYLES = {
  error: 'border-alerta bg-alerta-tenue text-alerta',
  info: 'border-borde bg-superficie text-tinta',
  success: 'border-exito bg-exito-tenue text-exito',
} as const

/**
 * Se monta una vez en la raiz. El contenedor lleva aria-live para que un lector de pantalla
 * anuncie los avisos segun entran, sin robar el foco de donde este el usuario.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-sm ${VARIANT_STYLES[toast.variant]}`}
        >
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Cerrar aviso"
            className="rounded text-lg leading-none opacity-60 foco hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
