interface PagePlaceholderProps {
  title: string
  description: string
}

/**
 * Hueco de una pantalla que todavia no existe. Esta para que las rutas sean reales y navegables
 * desde ya; cada una se sustituye por su pantalla de verdad cuando le toque.
 */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
      <p className="mt-6 rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        Pendiente de construir.
      </p>
    </section>
  )
}
