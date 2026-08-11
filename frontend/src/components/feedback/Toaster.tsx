import { useToastStore } from '@/store/toastStore'

const VARIANT_STYLES = {
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-slate-200 bg-white text-slate-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
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
            className="rounded text-lg leading-none opacity-60 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
