interface PaginationProps {
  page: number
  pageCount: number
  first: number
  last: number
  total: number
  /** Como se llama lo que se esta paginando, en plural ("movimientos"). */
  noun?: string
  onChange: (page: number) => void
}

/**
 * Controles de paginacion. Anterior/siguiente y nada mas: con una lista que cabe en pocas
 * paginas, una fila de numeros ocupa mas que la propia tabla, y con muchas habria que decidir
 * cuantos se enseñan y donde van los puntos suspensivos. Si algun dia hace falta saltar lejos, lo
 * que se necesita es un buscador, no treinta botones.
 */
export function Pagination({
  page,
  pageCount,
  first,
  last,
  total,
  noun = 'filas',
  onChange,
}: PaginationProps) {
  if (pageCount <= 1) {
    return (
      <p className="mt-3 text-sm text-tinta-tenue">
        {total} {noun}
      </p>
    )
  }

  return (
    <nav
      aria-label="Paginación"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      {/* aria-live para que al cambiar de pagina el lector de pantalla anuncie donde ha quedado:
          el foco se queda en el boton, que dice lo mismo antes y despues de pulsarlo. */}
      <p aria-live="polite" className="text-tinta-tenue">
        {first}–{last} de {total} {noun}
      </p>

      <div className="flex items-center gap-2">
        <PageButton disabled={page === 1} onClick={() => onChange(page - 1)}>
          ← Anterior
        </PageButton>
        <span className="cifra text-tinta-suave">
          {page} / {pageCount}
        </span>
        <PageButton disabled={page === pageCount} onClick={() => onChange(page + 1)}>
          Siguiente →
        </PageButton>
      </div>
    </nav>
  )
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-borde-fuerte px-3 py-1 font-medium text-tinta foco disabled:cursor-not-allowed disabled:border-borde disabled:text-tinta-tenue"
    >
      {children}
    </button>
  )
}
