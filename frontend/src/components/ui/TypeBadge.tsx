import type { TransactionType } from '@/types/common'

const VARIANTS = {
  INCOME: { label: 'Ingreso', className: 'bg-exito-tenue text-exito ring-exito/30' },
  EXPENSE: { label: 'Gasto', className: 'bg-alerta-tenue text-alerta ring-alerta/30' },
} as const

/**
 * El color no puede ser lo unico que distinga un ingreso de un gasto: el texto va dentro de la
 * propia etiqueta, para quien no separe esos dos colores.
 */
export function TypeBadge({ type }: { type: TransactionType }) {
  const { label, className } = VARIANTS[type]

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  )
}
