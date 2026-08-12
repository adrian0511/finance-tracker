import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renderiza el texto que devuelve la IA como Markdown.
 *
 * Los prompts del backend piden secciones y listas, no Markdown, pero los modelos lo escriben
 * igual: sin esto, la respuesta se lee con los `**` a la vista.
 *
 * Nada de HTML crudo, y no es un descuido: `react-markdown` no renderiza etiquetas por defecto
 * (haria falta anadir `rehype-raw` a proposito) y aqui no se anade. Es la propiedad que hace que
 * esto sea seguro con un texto que sale de un modelo al que el usuario le escribe — si el modelo
 * devuelve `<script>`, se ve escrito, no se ejecuta. Las URL peligrosas (`javascript:`) tambien
 * las corta la libreria por su cuenta.
 *
 * Los estilos van por `components` y no por una hoja global: cada etiqueta se pinta con los
 * tokens del sistema, que es lo que hace que esto funcione igual en claro y en oscuro.
 */

const components: Components = {
  // `pre-line` ademas del parrafo normal: un salto de linea suelto dentro de un parrafo lo
  // colapsa Markdown a un espacio, y estos modelos separan frases asi constantemente. El caracter
  // sobrevive en el texto, asi que basta con pedirle al CSS que lo respete.
  p: ({ children }) => <p className="whitespace-pre-line not-first:mt-3">{children}</p>,

  strong: ({ children }) => <strong className="font-semibold text-tinta">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  // Los tres niveles se pintan igual de discretos: dentro de una tarjeta que ya tiene su <h2>,
  // un titular del modelo es una division interna, no un titulo de seccion de la pagina.
  h1: ({ children }) => <Heading>{children}</Heading>,
  h2: ({ children }) => <Heading>{children}</Heading>,
  h3: ({ children }) => <Heading>{children}</Heading>,

  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="marker:text-tinta-tenue">{children}</li>,

  a: ({ href, children }) => (
    <a
      href={href}
      // El enlace lo escribe el modelo, no la aplicacion: se abre fuera y sin darle acceso a esta
      // pestana mediante window.opener.
      target="_blank"
      rel="noopener noreferrer"
      className="text-cobalto underline underline-offset-2 foco"
    >
      {children}
    </a>
  ),

  code: ({ children }) => (
    <code className="cifra rounded bg-superficie-alta px-1 py-0.5 text-[0.9em]">{children}</code>
  ),
  pre: ({ children }) => (
    // Con scroll propio: un bloque ancho no puede empujar la tarjeta a lo ancho.
    <pre className="mt-3 overflow-x-auto rounded-md bg-superficie-alta p-3 text-xs">{children}</pre>
  ),

  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 border-borde-fuerte pl-3 text-tinta-suave">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="mt-3 border-borde" />,

  // Las tablas llegan por remark-gfm. Tambien con scroll propio, por lo mismo que el <pre>.
  table: ({ children }) => (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-borde px-2 py-1 font-medium text-tinta-tenue">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-borde px-2 py-1">{children}</td>,
}

export function AIMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 font-semibold text-tinta not-first:mt-4">{children}</p>
}
