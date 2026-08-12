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
      className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div
        role="group"
        aria-label="Periodos rápidos"
        className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value.preset === preset}
            onClick={() => onChange(presetPeriod(preset))}
            className={`rounded px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
              value.preset === preset
                ? 'bg-white font-medium text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={fromId} className="text-xs font-medium text-slate-500">
            Desde
          </label>
          <input
            id={fromId}
            type="date"
            value={value.from}
            max={value.to}
            aria-invalid={inverted}
            onChange={(event) => setCustom({ from: event.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20 aria-invalid:border-red-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={toId} className="text-xs font-medium text-slate-500">
            Hasta
          </label>
          <input
            id={toId}
            type="date"
            value={value.to}
            min={value.from}
            aria-invalid={inverted}
            onChange={(event) => setCustom({ to: event.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/20 aria-invalid:border-red-500"
          />
        </div>
      </div>

      {inverted && (
        <p role="alert" className="text-sm text-red-700">
          La fecha inicial no puede ser posterior a la final.
        </p>
      )}
    </section>
  )
}
