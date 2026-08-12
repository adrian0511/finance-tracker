import type { IsoDateTime } from './common'

/**
 * Espeja {@code dto/ai/AIResponse}. Los cuatro endpoints de IA devuelven este mismo objeto:
 * el texto del modelo y cuando se genero.
 *
 * {@code response} es texto plano, no Markdown ni HTML: pintalo dentro de un elemento que
 * respete los saltos de linea (`whitespace-pre-line`) y nunca con dangerouslySetInnerHTML.
 * Sale de un modelo de lenguaje al que el usuario le escribe, asi que tratarlo como marcado
 * seria dejar que el contenido de la peticion decida que se renderiza.
 */
export interface AIResponse {
  response: string
  timestamp: IsoDateTime
}

/**
 * Espeja {@code dto/ai/CategorizeRequest}. El backend lo valida con @NotBlank, asi que un
 * string vacio o de solo espacios responde 400 sin llegar al modelo.
 */
export interface CategorizeRequest {
  description: string
}

/** Espeja {@code dto/ai/ChatRequest}. Mismo @NotBlank que CategorizeRequest. */
export interface ChatRequest {
  message: string
}
