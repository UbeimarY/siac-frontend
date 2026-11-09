import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, configurarExpiracion, tokens } from '../api/cliente'
import type { Rol, Usuario } from '../api/tipos'

interface Sesion {
  usuario: Usuario | null
  cargando: boolean
  iniciar: (email: string, password: string) => Promise<void>
  cerrar: () => Promise<void>
  recargar: () => Promise<void>
  tieneRol: (...roles: Rol[]) => boolean
  esGlobal: boolean
  soloLectura: boolean
}

const Ctx = createContext<Sesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    if (!tokens.acceso) {
      setUsuario(null)
      setCargando(false)
      return
    }
    try {
      setUsuario(await api.get<Usuario>('auth/me/'))
    } catch {
      tokens.limpiar()
      setUsuario(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    configurarExpiracion(() => setUsuario(null))
    void recargar()
  }, [recargar])

  const iniciar = useCallback(async (email: string, password: string) => {
    const d = await api.post<{ access: string; refresh: string; usuario: Usuario }>('auth/login/', { email, password })
    tokens.guardar(d.access, d.refresh)
    setUsuario(d.usuario)
  }, [])

  const cerrar = useCallback(async () => {
    try {
      await api.post('auth/logout/', { refresh: tokens.refresh })
    } catch {
      /* se cierra localmente de todos modos */
    }
    tokens.limpiar()
    setUsuario(null)
  }, [])

  const valor = useMemo<Sesion>(
    () => ({
      usuario,
      cargando,
      iniciar,
      cerrar,
      recargar,
      tieneRol: (...roles) => !!usuario && roles.includes(usuario.rol),
      esGlobal: !!usuario?.es_global,
      soloLectura: usuario?.rol === 'CONSULTA',
    }),
    [usuario, cargando, iniciar, cerrar, recargar],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSesion fuera de ProveedorSesion')
  return c
}
