import type { EstadoIndicador, Indicador, Nivel, Severidad, Tendencia } from '../api/tipos'

export const fecha = (s?: string | null) => {
  if (!s) return '—'
  const d = new Date(s.length === 10 ? `${s}T12:00:00` : s)
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const fechaHora = (s?: string | null) =>
  s ? new Date(s).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const hoyISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function valor(v: string | number | null | undefined, unidad?: Indicador['unidad']) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  const s = Number.isInteger(n) ? String(n) : n.toLocaleString('es-CO', { maximumFractionDigits: 2 })
  return unidad === 'PORCENTAJE' ? `${s}%` : s
}

export const meta = (i: Pick<Indicador, 'tipo_meta' | 'meta' | 'unidad'>) =>
  `${i.tipo_meta === 'MAYOR_IGUAL' ? '≥' : '≤'} ${valor(i.meta, i.unidad)}`

export const ESTADO_INDICADOR: Record<EstadoIndicador, { texto: string; clase: string }> = {
  AL_DIA: { texto: 'Al día', clase: 'bg-green-50 text-green-700 ring-green-200' },
  ALERTA: { texto: 'Alerta', clase: 'bg-amber-50 text-amber-700 ring-amber-200' },
  EN_RIESGO: { texto: 'En riesgo', clase: 'bg-red-50 text-red-700 ring-red-200' },
  DESACTUALIZADO: { texto: 'Desactualizado', clase: 'bg-slate-100 text-slate-700 ring-slate-300' },
  SIN_DATOS: { texto: 'Sin datos', clase: 'bg-slate-50 text-slate-500 ring-slate-200' },
}

export const NIVEL: Record<Nivel, { texto: string; clase: string; color: string; fondo: string }> = {
  BAJO: { texto: 'Bajo', clase: 'bg-green-50 text-green-700 ring-green-200', color: '#15803d', fondo: '#dcfce7' },
  MEDIO: { texto: 'Medio', clase: 'bg-amber-50 text-amber-700 ring-amber-200', color: '#b45309', fondo: '#fef3c7' },
  ALTO: { texto: 'Alto', clase: 'bg-red-50 text-red-700 ring-red-200', color: '#b91c1c', fondo: '#fee2e2' },
}

export const SEVERIDAD: Record<Severidad, { texto: string; clase: string; punto: string }> = {
  ALTA: { texto: 'Alta', clase: 'bg-red-50 text-red-700 ring-red-200', punto: 'bg-red-500' },
  MEDIA: { texto: 'Media', clase: 'bg-amber-50 text-amber-700 ring-amber-200', punto: 'bg-amber-500' },
  BAJA: { texto: 'Baja', clase: 'bg-sky-50 text-sky-700 ring-sky-200', punto: 'bg-sky-500' },
}

export const TENDENCIA: Record<Tendencia, { simbolo: string; texto: string; clase: string }> = {
  MEJORA: { simbolo: '↑', texto: 'Mejora', clase: 'text-green-600' },
  ESTABLE: { simbolo: '→', texto: 'Estable', clase: 'text-slate-500' },
  DETERIORO: { simbolo: '↓', texto: 'Deterioro', clase: 'text-red-600' },
  SIN_DATOS: { simbolo: '·', texto: 'Sin histórico', clase: 'text-slate-400' },
}

export const ESTADO_EVIDENCIA: Record<string, { texto: string; clase: string }> = {
  POR_CARGAR: { texto: 'Por cargar', clase: 'bg-slate-100 text-slate-700 ring-slate-300' },
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-amber-50 text-amber-700 ring-amber-200' },
  APROBADA: { texto: 'Aprobada', clase: 'bg-green-50 text-green-700 ring-green-200' },
  RECHAZADA: { texto: 'Rechazada', clase: 'bg-red-50 text-red-700 ring-red-200' },
  VENCIDA: { texto: 'Vencida', clase: 'bg-red-100 text-red-800 ring-red-300' },
}

export const ESTADO_PLAN: Record<string, { texto: string; clase: string }> = {
  PROGRAMADO: { texto: 'Programado', clase: 'bg-slate-100 text-slate-700 ring-slate-300' },
  EN_EJECUCION: { texto: 'En ejecución', clase: 'bg-sky-50 text-sky-700 ring-sky-200' },
  POR_CERRAR: { texto: 'Por cerrar', clase: 'bg-violet-50 text-violet-700 ring-violet-200' },
  CERRADO: { texto: 'Cerrado', clase: 'bg-green-50 text-green-700 ring-green-200' },
  CANCELADO: { texto: 'Cancelado', clase: 'bg-slate-50 text-slate-500 ring-slate-200' },
  RETRASADO: { texto: 'Retrasado', clase: 'bg-red-50 text-red-700 ring-red-200' },
}

export const ESTADO_PROGRAMA: Record<string, string> = {
  CONSOLIDACION: 'bg-slate-100 text-slate-700 ring-slate-300',
  RUTA_ACREDITACION: 'bg-sky-50 text-sky-700 ring-sky-200',
  ACREDITADO: 'bg-green-50 text-green-700 ring-green-200',
  REACREDITACION: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export const COMPONENTES: Record<string, string> = {
  tendencia: 'Tendencia del indicador',
  brecha: 'Brecha frente a la meta',
  evidencia: 'Evidencia faltante',
  vencimiento: 'Proximidad al vencimiento',
  visita: 'Cercanía a la visita de pares',
}
