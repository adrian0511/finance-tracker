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
      <label htmlFor={id} className="text-sm font-medium text-tinta-suave">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        className="rounded-md border border-borde-fuerte bg-superficie px-3 py-2 text-tinta foco placeholder:text-tinta-tenue aria-invalid:border-alerta aria-invalid:[--anillo:var(--alerta)]"
        {...props}
      />
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-alerta">
          {error}
        </p>
      )}
    </div>
  )
}
