import type { ComponentPropsWithRef } from 'react'

interface TextFieldProps extends ComponentPropsWithRef<'input'> {
  label: string
  /** Mensaje de error de react-hook-form. Si viene, el campo se marca como invalido. */
  error?: string
}

/**
 * Campo de formulario con su label y su error. La accesibilidad va aqui y no en cada pantalla:
 * `aria-invalid` para que el lector de pantalla anuncie el estado, `aria-describedby` para que
 * lea el error junto al campo, y `role="alert"` para que lo anuncie al aparecer.
 */
export function TextField({ label, error, id, ...props }: TextFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20 aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-500/20"
        {...props}
      />
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
