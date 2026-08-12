/*
 * Validador de la paleta. `pnpm palette`.
 *
 * El CLAUDE.md del frontend dice que los colores no se eligen a ojo; esto es lo que lo comprueba.
 * No lleva su propia copia de los colores a proposito: los lee de `src/index.css` (los tokens de
 * la interfaz, en :root y en .dark) y de `src/components/charts/palette.ts` (los de los
 * graficos), asi que cambiar un color y no volver a pasar esto se nota aqui, no en produccion.
 *
 * Comprueba dos cosas distintas:
 *
 *   - Contraste WCAG. 4.5:1 para texto, 3:1 para lo que es una mancha de color con significado
 *     (el borde de un campo, el relleno de un boton, una barra).
 *   - Separacion perceptual: distancia en OKLab (x100) entre los colores que hay que poder
 *     distinguir entre si, simulando ademas protanopia y deuteranopia con las matrices de
 *     Vienot (1999). La tritanopia se calcula y se informa, pero no rompe: azul y verde en la
 *     misma escala categorica se confunden con ella casi por definicion, y quitar uno de los dos
 *     empeora el resultado para las otras tres visiones, que son las que afectan a ~8% de los
 *     hombres.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------- color basico

const canal = (h) => {
  const s = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
}

const aHex = (rgb) =>
  '#' +
  rgb
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')

const aLineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const aSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

function luminancia(h) {
  const [r, g, b] = canal(h).map(aLineal)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a, b) {
  const [alta, baja] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (alta + 0.05) / (baja + 0.05)
}

function oklab(h) {
  const [r, g, b] = canal(h).map(aLineal)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function distancia(a, b) {
  const [l1, a1, b1] = oklab(a)
  const [l2, a2, b2] = oklab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100
}

// ------------------------------------------------------- simulacion de dicromacias

const RGB_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
]
const LMS_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
]
const DICROMACIAS = {
  protan: [
    [0, 1.05118294, -0.05116099],
    [0, 1, 0],
    [0, 0, 1],
  ],
  deutan: [
    [1, 0, 0],
    [0.9513092, 0, 0.04866992],
    [0, 0, 1],
  ],
  tritan: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.86744736, 1.86727089, 0],
  ],
}

const porMatriz = (m, v) => m.map((fila) => fila.reduce((suma, k, i) => suma + k * v[i], 0))

function simular(h, vision) {
  if (vision === 'normal') {
    return h
  }
  const lms = porMatriz(RGB_LMS, canal(h).map(aLineal))
  return aHex(porMatriz(LMS_RGB, porMatriz(DICROMACIAS[vision], lms)).map(aSrgb))
}

const VISIONES = ['normal', 'protan', 'deutan']

function peorPar(a, b, visiones = VISIONES) {
  return visiones
    .map((vision) => ({ vision, d: distancia(simular(a, vision), simular(b, vision)) }))
    .sort((x, y) => x.d - y.d)[0]
}

// ------------------------------------------------------------ lectura de los fuentes

const css = readFileSync(join(raiz, 'src/index.css'), 'utf8')
const ts = readFileSync(join(raiz, 'src/components/charts/palette.ts'), 'utf8')

/** Las variables de un bloque de `index.css` (`:root` o `.dark`). */
function tokens(selector) {
  const bloque = new RegExp(`\\n${selector}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)
  if (bloque === null) {
    throw new Error(`No encuentro el bloque ${selector} en src/index.css`)
  }

  const valores = {}
  for (const [, nombre, valor] of bloque[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    valores[nombre] = valor.toLowerCase()
  }
  return valores
}

/** Los colores de una de las dos paletas de graficos de `palette.ts`. */
function grafico(constante) {
  const bloque = new RegExp(`const ${constante}: ChartPalette = \\{([\\s\\S]*?)\\n\\}`).exec(ts)
  if (bloque === null) {
    throw new Error(`No encuentro ${constante} en src/components/charts/palette.ts`)
  }
  const cuerpo = bloque[1]

  const uno = (campo) => {
    const encontrado = new RegExp(`${campo}: '(#[0-9a-fA-F]{6})'`).exec(cuerpo)
    if (encontrado === null) {
      throw new Error(`${constante} no tiene ${campo}`)
    }
    return encontrado[1].toLowerCase()
  }

  return {
    categorias: [.../categorias: \[([\s\S]*?)\]/.exec(cuerpo)[1].matchAll(/#[0-9a-fA-F]{6}/g)].map(
      (m) => m[0].toLowerCase(),
    ),
    otras: uno('otras'),
    ingreso: uno('ingreso'),
    gasto: uno('gasto'),
    meta: uno('meta'),
    escenarios: {
      optimistic: uno('optimistic'),
      realistic: uno('realistic'),
      pessimistic: uno('pessimistic'),
    },
  }
}

const TEMAS = [
  { nombre: 'claro', ui: tokens(':root'), chart: grafico('CLARO') },
  { nombre: 'oscuro', ui: tokens('\\.dark'), chart: grafico('OSCURO') },
]

// ---------------------------------------------------------------- comprobaciones

let fallos = 0
let avisos = 0

function comprobar(estado, etiqueta, detalle) {
  if (estado === 'aviso') {
    avisos++
    console.log(`  aviso  ${etiqueta} — ${detalle}`)
  } else if (estado) {
    console.log(`  ok     ${etiqueta} — ${detalle}`)
  } else {
    fallos++
    console.log(`  FALLO  ${etiqueta} — ${detalle}`)
  }
}

function contrasteMinimo(etiqueta, frente, fondo, minimo, suave = false) {
  const c = contraste(frente, fondo)
  comprobar(
    c >= minimo ? true : suave ? 'aviso' : false,
    etiqueta,
    `${c.toFixed(2)}:1 (≥ ${minimo})`,
  )
}

for (const { nombre, ui, chart } of TEMAS) {
  console.log(`\n=== Tema ${nombre} ===`)

  console.log('\n-- Texto (4.5:1) --')
  for (const tinta of ['tinta', 'tinta-suave', 'tinta-tenue']) {
    for (const fondo of ['lienzo', 'superficie', 'superficie-alta']) {
      contrasteMinimo(`${tinta} sobre ${fondo}`, ui[tinta], ui[fondo], 4.5)
    }
  }
  for (const color of ['cobalto', 'alerta', 'exito', 'laton']) {
    contrasteMinimo(`${color} sobre superficie`, ui[color], ui.superficie, 4.5)
    contrasteMinimo(`${color} sobre lienzo`, ui[color], ui.lienzo, 4.5)
  }
  for (const [color, fondo] of [
    ['alerta', 'alerta-tenue'],
    ['exito', 'exito-tenue'],
    ['laton', 'laton-tenue'],
    ['tinta', 'cobalto-tenue'],
    ['cobalto', 'cobalto-tenue'],
  ]) {
    contrasteMinimo(`${color} sobre ${fondo}`, ui[color], ui[fondo], 4.5)
  }
  contrasteMinimo('accion-tinta sobre accion', ui['accion-tinta'], ui.accion, 4.5)
  contrasteMinimo('peligro-tinta sobre peligro', ui['peligro-tinta'], ui.peligro, 4.5)

  console.log('\n-- Elementos no textuales (3:1) --')
  contrasteMinimo('borde-fuerte sobre superficie', ui['borde-fuerte'], ui.superficie, 3)
  contrasteMinimo('borde-fuerte sobre lienzo', ui['borde-fuerte'], ui.lienzo, 3)
  contrasteMinimo('accion sobre lienzo', ui.accion, ui.lienzo, 3)
  contrasteMinimo('cobalto (anillo de foco) sobre lienzo', ui.cobalto, ui.lienzo, 3)
  // El borde fino de una tarjeta no lleva informacion: separa, y si no se viera tampoco se
  // perderia nada. Se informa y no rompe.
  contrasteMinimo('borde sobre superficie', ui.borde, ui.superficie, 3, true)

  console.log('\n-- Marcas de los graficos sobre la tarjeta (3:1) --')
  for (const [i, color] of chart.categorias.entries()) {
    // Tres tonos de la escala clara no llegan, y es una decision tomada: la leyenda del donut
    // lleva el importe escrito al lado, asi que el color nunca es el unico portador del dato.
    contrasteMinimo(`categoria ${i + 1}`, color, ui.superficie, 3, true)
  }
  for (const campo of ['otras', 'ingreso', 'gasto', 'meta']) {
    contrasteMinimo(campo, chart[campo], ui.superficie, 3)
  }
  for (const [clave, color] of Object.entries(chart.escenarios)) {
    contrasteMinimo(`escenario ${clave}`, color, ui.superficie, 3)
  }

  // El donut es un circulo: la ultima porcion tambien toca a la primera. Y hay dos circulos
  // posibles segun cuantas categorias tenga el periodo.
  console.log('\n-- Porciones vecinas del donut (dE ≥ 8) --')
  const anillos = [
    ['6 categorias', chart.categorias],
    ['5 + Otras', [...chart.categorias.slice(0, 5), chart.otras]],
  ]
  for (const [caso, anillo] of anillos) {
    for (let i = 0; i < anillo.length; i++) {
      const a = anillo[i]
      const b = anillo[(i + 1) % anillo.length]
      const peor = peorPar(a, b)
      const tritan = peorPar(a, b, ['tritan'])
      comprobar(
        peor.d >= 8,
        `${caso}: ${a} vs ${b}`,
        `dE ${peor.d.toFixed(1)} (${peor.vision}) · tritan ${tritan.d.toFixed(1)}`,
      )
    }
  }

  console.log('\n-- Ingreso vs gasto (dE ≥ 12) --')
  for (const vision of [...VISIONES, 'tritan']) {
    const d = distancia(simular(chart.ingreso, vision), simular(chart.gasto, vision))
    comprobar(
      vision === 'tritan' && d < 12 ? 'aviso' : d >= 12,
      `ingreso/gasto (${vision})`,
      `dE ${d.toFixed(1)}`,
    )
  }

  console.log('\n-- Escenarios de la proyeccion entre si (dE ≥ 10) --')
  const escenarios = Object.entries(chart.escenarios)
  for (let i = 0; i < escenarios.length; i++) {
    for (let j = i + 1; j < escenarios.length; j++) {
      const peor = peorPar(escenarios[i][1], escenarios[j][1])
      comprobar(
        peor.d >= 10,
        `${escenarios[i][0]} vs ${escenarios[j][0]}`,
        `dE ${peor.d.toFixed(1)} (${peor.vision})`,
      )
    }
  }
}

console.log(`\n${fallos} fallos, ${avisos} avisos`)
process.exit(fallos === 0 ? 0 : 1)
