import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { AI_RETRY_LATER, getErrorMessage, isTemporaryAiError } from '@/api/errors'
import { AIMarkdown } from '@/components/ui/AIMarkdown'
import { useChat } from '@/hooks/useAI'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Conversacion con el asesor. La pantalla, de arriba abajo:
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ Asistente                                                 │
 *   │ (aviso: no ve tus movimientos)                            │
 *   ├───────────────────────────────────────────────────────────┤
 *   │                                    ┌────────────────────┐ │
 *   │                                    │ tu mensaje         │ │
 *   │ ┌────────────────────┐             └────────────────────┘ │
 *   │ │ respuesta          │                                    │
 *   │ └────────────────────┘                                    │
 *   │ ● Escribiendo…                                            │
 *   ├───────────────────────────────────────────────────────────┤
 *   │ [ escribe aquí…                              ]  [Enviar]  │
 *   └───────────────────────────────────────────────────────────┘
 *
 * El historial es estado local y se pierde al refrescar: el backend no guarda la conversacion
 * (`/api/ai/chat` recibe un mensaje suelto y no una conversacion), asi que no hay nada que
 * recuperar al volver. Para un proyecto personal esta bien; el dia que se quiera persistir, el
 * cambio empieza en el backend, no aqui.
 *
 * Y ojo con eso: como cada peticion lleva **solo** el mensaje actual, el modelo no recuerda lo
 * anterior aunque en pantalla parezca una conversacion. Se avisa en el pie del formulario.
 */

interface ChatMessage {
  id: string
  /** `error` es de la aplicacion, no del modelo: se pinta como aviso y no como una respuesta. */
  author: 'user' | 'assistant' | 'error'
  text: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')

  const chat = useChat()
  const reducedMotion = useReducedMotion()

  const threadEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Al fondo en cada cambio: lo ultimo que se ha dicho es lo que interesa, y tambien mientras
  // sale «Escribiendo…», que si no aparece por debajo del borde y parece que no pasa nada.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'end',
    })
  }, [messages, chat.isPending, reducedMotion])

  const canSend = draft.trim().length > 0 && !chat.isPending

  const send = () => {
    const text = draft.trim()
    if (text.length === 0 || chat.isPending) {
      return
    }

    // El mensaje del usuario entra en el hilo antes de que salga la peticion: la respuesta tarda
    // segundos y dejar el campo vacio sin nada nuevo arriba parece que se ha perdido.
    setMessages((current) => [...current, { id: crypto.randomUUID(), author: 'user', text }])
    setDraft('')

    chat.mutate(text, {
      onSuccess: (data) =>
        setMessages((current) => [
          ...current,
          { id: crypto.randomUUID(), author: 'assistant', text: data.response },
        ]),
      // El fallo se queda en el hilo, en el hueco de la respuesta que no llego, en vez de en un
      // toast que desaparece: asi se ve a que mensaje corresponde y sigue ahi al volver a leer.
      onError: (error) =>
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            author: 'error',
            text: isTemporaryAiError(error)
              ? AI_RETRY_LATER
              : getErrorMessage(error, 'No se ha podido enviar el mensaje.'),
          },
        ]),
      // El foco vuelve al campo tanto si va bien como si no: se acaba de rehabilitar y lo
      // siguiente que quiere hacer cualquiera es escribir otra vez.
      onSettled: () => inputRef.current?.focus(),
    })
  }

  return (
    <section className="flex flex-col">
      <h1 className="text-3xl font-semibold tracking-tight text-tinta">Asistente</h1>
      <p className="mt-2 text-tinta-suave">Preguntas generales sobre finanzas personales.</p>

      {/* La conversacion tiene su propio scroll y una altura acotada: el campo de escribir se
          queda siempre a la vista, sin tener que bajar hasta el final de una pagina que crece
          con cada mensaje. */}
      <div
        className="mt-6 flex max-h-[60vh] min-h-64 flex-col gap-3 overflow-y-auto rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta"
        role="log"
        aria-label="Conversación"
        aria-live="polite"
      >
        {messages.length === 0 && !chat.isPending ? (
          <p className="m-auto max-w-sm text-center text-sm text-tinta-tenue">
            Pregúntale lo que quieras sobre ahorro, presupuestos o deudas. Por ejemplo: «¿cuánto
            conviene tener ahorrado para imprevistos?».
          </p>
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} />)
        )}

        {chat.isPending && (
          <p className="flex items-center gap-2 self-start text-sm text-tinta-suave">
            <span
              aria-hidden="true"
              className={`inline-block size-2 rounded-full bg-cobalto ${reducedMotion ? '' : 'animate-pulse'}`}
            />
            Escribiendo…
          </p>
        )}

        {/* Ancla del autoscroll. Va fuera de la lista para que valga tambien con el hilo vacio. */}
        <div ref={threadEndRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
        className="mt-4 flex flex-wrap gap-3"
      >
        <label htmlFor="message" className="sr-only">
          Tu mensaje
        </label>
        {/* Enter envia sin nada especial: es un input dentro de un form, y el navegador ya lo
            hace. Se deshabilita mientras se espera para no encadenar peticiones a un modelo con
            cuota — dos preguntas seguidas se comerian el limite y la segunda respuesta llegaria
            fuera de sitio, porque el backend no relaciona una con otra. */}
        <input
          id="message"
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={chat.isPending}
          autoComplete="off"
          placeholder={chat.isPending ? 'Esperando la respuesta…' : 'Escribe tu pregunta…'}
          className="min-w-0 flex-1 rounded-md border border-borde-fuerte bg-superficie px-3 py-2 text-tinta foco placeholder:text-tinta-tenue disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="h-10 rounded-md bg-accion px-4 font-medium text-accion-tinta foco disabled:opacity-60"
        >
          Enviar
        </button>
      </form>

      {/*
        Nota de alcance, deliberadamente pequena y al pie: es una aclaracion que se consulta al
        chocar con ella, no un aviso que haya que leer antes de empezar. Un banner arriba ocuparia
        mas que la primera respuesta y se seguiria ignorando igual.

        Dice lo mismo que el system prompt del backend, y esa coincidencia no es decorativa: alli
        se le ordena al modelo que, sin acceso a los movimientos, remita al analisis y al informe.
        Si un dia se cambia el prompt para darle los datos, este texto pasa a ser mentira.
      */}
      <p className="mt-2 text-xs leading-relaxed text-tinta-tenue">
        El asistente no ve tus movimientos: para tus cifras concretas están el análisis y el informe
        del mes, en el{' '}
        <Link to="/dashboard" className="underline underline-offset-2 foco">
          resumen
        </Link>
        . Y lo que vas a ahorrar o cuándo alcanzas una meta sale de{' '}
        <Link to="/goals" className="underline underline-offset-2 foco">
          Metas
        </Link>
        , que lo calcula con tus movimientos reales; el chat te mandará ahí en vez de estimarlo a
        ojo.
      </p>

      <p className="mt-1 text-xs text-tinta-tenue">
        Cada pregunta se manda por separado: el asistente no recuerda lo anterior. La conversación
        no se guarda y se pierde al recargar.
      </p>
    </section>
  )
}

/**
 * Tu a la derecha, el asistente a la izquierda. El lado no es lo unico que los separa: tambien
 * el color de fondo, porque «a la derecha» se pierde en cuanto un mensaje ocupa el ancho entero
 * y no se ve para nadie que no distinga la alineacion de un vistazo.
 */
function Bubble({ message }: { message: ChatMessage }) {
  if (message.author === 'error') {
    return (
      <p
        role="alert"
        className="max-w-[85%] self-start rounded-lg bg-superficie-alta px-3 py-2 text-sm text-tinta-suave"
      >
        {message.text}
      </p>
    )
  }

  // Lo que escribe el usuario se pinta tal cual: si alguien manda unos asteriscos, lo que espera
  // ver son sus asteriscos, no una palabra en negrita. El Markdown solo se interpreta en lo que
  // devuelve el modelo, que es lo unico que lo escribe queriendo.
  if (message.author === 'user') {
    return (
      <p className="max-w-[85%] self-end rounded-lg bg-cobalto-tenue px-3 py-2 text-sm leading-relaxed whitespace-pre-line text-tinta">
        {message.text}
      </p>
    )
  }

  return (
    <div className="max-w-[85%] self-start rounded-lg bg-superficie-alta px-3 py-2 text-sm leading-relaxed text-tinta">
      <AIMarkdown>{message.text}</AIMarkdown>
    </div>
  )
}
