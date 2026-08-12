import type { ComponentPropsWithRef } from 'react'

interface SelectFieldProps extends ComponentPropsWithRef<'select'> {
  label: string
  error?: string
}

/** Mismo contrato que TextField: label, error y las ayudas de accesibilidad en un solo sitio. */
export function SelectField({ label, error, id, children, ...props }: SelectFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-tinta-suave">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        className="rounded-md border border-borde-fuerte bg-superficie px-3 py-2 text-tinta foco aria-invalid:border-alerta aria-invalid:[--anillo:var(--alerta)]"
        {...props}
      >
        {children}
      </select>
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-alerta">
          {error}
        </p>
      )}
    </div>
  )
}
