import { useId } from 'react'

import { PRESET_LABELS, presetPeriod, type Period, type PeriodPreset } from '@/utils/period'

const PRESETS: Exclude<PeriodPreset, 'custom'>[] = ['today', 'week', 'month', 'year']

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

/**
 * Un unico selector arriba que manda sobre todos los informes de la pagina. Deliberadamente no
 * hay uno por grafico: si cada tarjeta trajera su rango, dos graficos contiguos podrian estar
 * ensenando periodos distintos sin que se note.
 *
 * El rango se valida aqui ademas de en el backend (que responde 400 si from > to): asi el aviso
 * sale al lado del campo mal puesto en vez de como un error rojo encima de cuatro graficos.
 */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const fromId = useId()
  const toId = useId()
  const inverted = value.from > value.to

  const setCustom = (patch: Partial<Pick<Period, 'from' | 'to'>>) =>
    onChange({ ...value, ...patch, preset: 'custom' })

  return (
    <section
      aria-label="Periodo"
      className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta"
    >
      <div
        role="group"
        aria-label="Periodos rápidos"
        className="flex flex-wrap gap-1 rounded-md bg-superficie-alta p-1"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value.preset === preset}
            onClick={() => onChange(presetPeriod(preset))}
            className={`rounded px-3 py-1.5 text-sm foco ${
              value.preset === preset
                ? 'bg-superficie font-medium text-tinta shadow-sm'
                : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={fromId} className="text-xs font-medium text-tinta-tenue">
            Desde
          </label>
          <input
            id={fromId}
            type="date"
            value={value.from}
            max={value.to}
            aria-invalid={inverted}
            onChange={(event) => setCustom({ from: event.target.value })}
            className="cifra foco rounded-md border border-borde-fuerte bg-superficie px-2 py-1.5 text-sm text-tinta aria-invalid:border-alerta aria-invalid:[--anillo:var(--alerta)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={toId} className="text-xs font-medium text-tinta-tenue">
            Hasta
          </label>
          <input
            id={toId}
            type="date"
            value={value.to}
            min={value.from}
            aria-invalid={inverted}
            onChange={(event) => setCustom({ to: event.target.value })}
            className="cifra foco rounded-md border border-borde-fuerte bg-superficie px-2 py-1.5 text-sm text-tinta aria-invalid:border-alerta aria-invalid:[--anillo:var(--alerta)]"
          />
        </div>
      </div>

      {inverted && (
        <p role="alert" className="text-sm text-alerta">
          La fecha inicial no puede ser posterior a la final.
        </p>
      )}
    </section>
  )
}
