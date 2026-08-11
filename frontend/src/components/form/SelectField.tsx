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
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20 aria-invalid:border-red-500"
        {...props}
      >
        {children}
      </select>
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
