import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmacion sobre el elemento nativo <dialog> con showModal(): asi el atrapado del foco, el
 * cierre con Escape y el fondo inerte los pone el navegador. Hacerlo a mano con divs obliga a
 * reimplementar las tres cosas, y es justo donde se rompe la accesibilidad.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      // Escape cierra el dialogo por su cuenta; sin esto el estado de React se quedaria en
      // "abierto" y no habria forma de volver a abrirlo.
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-full max-w-sm rounded-lg border border-slate-200 p-6 text-slate-900 backdrop:bg-slate-900/40"
    >
      <h2 id="confirm-title" className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending ? 'Borrando…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
