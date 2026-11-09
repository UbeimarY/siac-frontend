/** Cliente HTTP de la API del SIAC con renovación automática del token JWT. */

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') + '/api'

const CLAVE_ACCESO = 'siac.access'
const CLAVE_REFRESH = 'siac.refresh'

export class ErrorApi extends Error {
  estado: number
  datos: unknown
  constructor(estado: number, datos: unknown, mensaje?: string) {
    super(mensaje ?? mensajeDeError(datos) ?? `Error ${estado}`)
    this.estado = estado
    this.datos = datos
  }
}

/** Convierte las respuestas de error de DRF en un mensaje legible. */
export function mensajeDeError(datos: unknown): string | undefined {
  if (!datos) return undefined
  if (typeof datos === 'string') return datos
  if (Array.isArray(datos)) return datos.map(mensajeDeError).filter(Boolean).join(' ')
  if (typeof datos === 'object') {
    const d = datos as Record<string, unknown>
    if (typeof d.detail === 'string') return d.detail
    return Object.entries(d)
      .map(([k, v]) => {
        const m = mensajeDeError(v)
        return k === 'non_field_errors' || k === 'detail' ? m : `${k.replaceAll('_', ' ')}: ${m}`
      })
      .filter(Boolean)
      .join(' · ')
  }
  return undefined
}

function leer(clave: string) {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

export const tokens = {
  get acceso() {
    return leer(CLAVE_ACCESO)
  },
  get refresh() {
    return leer(CLAVE_REFRESH)
  },
  guardar(acceso: string, refresh?: string) {
    try {
      localStorage.setItem(CLAVE_ACCESO, acceso)
      if (refresh) localStorage.setItem(CLAVE_REFRESH, refresh)
    } catch {
      /* almacenamiento no disponible */
    }
  },
  limpiar() {
    try {
      localStorage.removeItem(CLAVE_ACCESO)
      localStorage.removeItem(CLAVE_REFRESH)
    } catch {
      /* noop */
    }
  },
}

let renovando: Promise<boolean> | null = null
let alExpirar: () => void = () => {}
export const configurarExpiracion = (fn: () => void) => {
  alExpirar = fn
}

async function renovar(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) return false
  renovando ??= fetch(`${BASE}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
    .then(async (r) => {
      if (!r.ok) return false
      const d = await r.json()
      tokens.guardar(d.access, d.refresh)
      return true
    })
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (renovando = null), 0)
    })
  return renovando
}

type Opciones = Omit<RequestInit, 'body'> & { cuerpo?: unknown; params?: Record<string, unknown>; crudo?: boolean }

function construirUrl(ruta: string, params?: Record<string, unknown>) {
  const url = `${BASE}/${ruta.replace(/^\//, '')}`
  if (!params) return url
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `${url}?${s}` : url
}

export async function solicitud<T = unknown>(ruta: string, opciones: Opciones = {}, reintento = true): Promise<T> {
  const { cuerpo, params, crudo, headers, ...resto } = opciones
  const h = new Headers(headers)
  const acceso = tokens.acceso
  if (acceso) h.set('Authorization', `Bearer ${acceso}`)
  let body: BodyInit | undefined
  if (cuerpo instanceof FormData) body = cuerpo
  else if (cuerpo !== undefined) {
    h.set('Content-Type', 'application/json')
    body = JSON.stringify(cuerpo)
  }
  const r = await fetch(construirUrl(ruta, params), { ...resto, headers: h, body })
  if (r.status === 401 && reintento && tokens.refresh && !ruta.startsWith('auth/login')) {
    if (await renovar()) return solicitud<T>(ruta, opciones, false)
    tokens.limpiar()
    alExpirar()
  }
  if (!r.ok) {
    let datos: unknown = null
    try {
      datos = await r.json()
    } catch {
      /* sin cuerpo */
    }
    if (r.status === 429) throw new ErrorApi(429, datos, 'Demasiadas solicitudes. Espere un momento e intente de nuevo.')
    throw new ErrorApi(r.status, datos)
  }
  if (crudo) return r as unknown as T
  if (r.status === 204 || r.status === 205) return undefined as T
  return (await r.json()) as T
}

export const api = {
  get: <T>(ruta: string, params?: Record<string, unknown>) => solicitud<T>(ruta, { params }),
  post: <T>(ruta: string, cuerpo?: unknown, params?: Record<string, unknown>) =>
    solicitud<T>(ruta, { method: 'POST', cuerpo, params }),
  patch: <T>(ruta: string, cuerpo?: unknown) => solicitud<T>(ruta, { method: 'PATCH', cuerpo }),
  delete: <T>(ruta: string) => solicitud<T>(ruta, { method: 'DELETE' }),
}

/** Descarga un archivo autenticado (PDF, Excel, CSV, evidencias). */
export async function descargar(ruta: string, params?: Record<string, unknown>, opciones: Opciones = {}) {
  const r = await solicitud<Response>(ruta, { ...opciones, params, crudo: true })
  const tipo = r.headers.get('Content-Type') ?? ''
  if (tipo.includes('application/json')) {
    const d = await r.json()
    if (d.url) window.open(d.url, '_blank', 'noopener')
    return
  }
  const disp = r.headers.get('Content-Disposition') ?? ''
  const nombre = /filename="?([^"]+)"?/.exec(disp)?.[1] ?? 'archivo'
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
