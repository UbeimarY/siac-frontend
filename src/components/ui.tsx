import clsx from 'clsx'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { NIVEL } from '../lib/formato'
import type { Nivel } from '../api/tipos'

export function Insignia({ clase, children, titulo }: { clase: string; children: ReactNode; titulo?: string }) {
  return (
    <span title={titulo} className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', clase)}>
      {children}
    </span>
  )
}

export function NivelRiesgo({ nivel, puntaje }: { nivel: Nivel | null | undefined; puntaje?: number | null }) {
  if (!nivel) return <span className="text-slate-400">—</span>
  return (
    <Insignia clase={NIVEL[nivel].clase}>
      {puntaje !== undefined && puntaje !== null && <strong>{Math.round(puntaje)}</strong>}
      {NIVEL[nivel].texto}
    </Insignia>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden /> {texto}
    </div>
  )
}

export function MensajeError({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex-1">{msg}</div>
      {reintentar && (
        <button className="btn-secundario btn-chico" onClick={reintentar}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Vacio({ titulo, children, icono }: { titulo: string; children?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icono && <div className="text-slate-300">{icono}</div>}
      <p className="font-medium text-slate-700">{titulo}</p>
      {children && <div className="max-w-md text-sm text-slate-500">{children}</div>}
    </div>
  )
}

export function Encabezado({ titulo, subtitulo, acciones }: { titulo: string; subtitulo?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-marca-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  )
}

export function Modal({
  abierto,
  cerrar,
  titulo,
  children,
  pie,
  ancho = 'max-w-lg',
}: {
  abierto: boolean
  cerrar: () => void
  titulo: string
  children: ReactNode
  pie?: ReactNode
  ancho?: string
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abierto) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [abierto, cerrar])
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={cerrar}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={clsx('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', ancho)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id={id} className="text-lg font-semibold text-marca-900">
            {titulo}
          </h2>
          <button onClick={cerrar} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{pie}</div>}
      </div>
    </div>
  )
}

export function Campo({ etiqueta, children, ayuda, error }: { etiqueta: string; children: ReactNode; ayuda?: string; error?: string }) {
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      {children}
      {ayuda && !error && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Barra({ valor, color, max = 100 }: { valor: number; color?: string; max?: number }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color ?? '#2b4c7e' }} />
    </div>
  )
}

export function Filtros({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-3">{children}</div>
}

export function Selector({
  etiqueta,
  valor,
  cambiar,
  opciones,
  todos = 'Todos',
}: {
  etiqueta: string
  valor: string
  cambiar: (v: string) => void
  opciones: { valor: string | number; texto: string }[]
  todos?: string | null
}) {
  return (
    <label className="min-w-40 flex-1 sm:flex-none">
      <span className="mb-1 block text-xs font-medium text-slate-500">{etiqueta}</span>
      <select className="campo py-1.5" value={valor} onChange={(e) => cambiar(e.target.value)}>
        {todos !== null && <option value="">{todos}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Avatar({ iniciales, chico }: { iniciales: string; chico?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-marca-700 font-semibold text-white',
        chico ? 'size-7 text-[11px]' : 'size-9 text-sm',
      )}
      aria-hidden
    >
      {iniciales}
    </span>
  )
}

export function TablaContenedor({ children }: { children: ReactNode }) {
  return <div className="tarjeta overflow-x-auto">{children}</div>
}
