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
      <h1 className="text-3xl font-semibold tracking-tight text-tinta">{title}</h1>
      <p className="mt-2 text-tinta-suave">{description}</p>
      <p className="mt-6 rounded-md border border-dashed border-borde-fuerte px-4 py-8 text-center text-sm text-tinta-tenue">
        Pendiente de construir.
      </p>
    </section>
  )
}
