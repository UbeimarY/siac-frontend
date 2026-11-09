import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Search,
  Settings2,
  Sparkles,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/cliente'
import { useSesion } from '../auth/AuthContext'
import ErrorBoundary from './ErrorBoundary'
import { Avatar } from './ui'

const NAV = [
  { a: '/', texto: 'Inicio', icono: LayoutDashboard, fin: true },
  { a: '/programas', texto: 'Programas', icono: GraduationCap },
  { a: '/indicadores', texto: 'Indicadores', icono: BarChart3 },
  { a: '/evidencias', texto: 'Evidencias', icono: FolderOpen },
  { a: '/alertas', texto: 'Alertas', icono: TriangleAlert },
  { a: '/planes', texto: 'Planes de mejoramiento', icono: ClipboardList },
  { a: '/reportes', texto: 'Reportes', icono: FileText },
  { a: '/asistente', texto: 'Asistente IA', icono: Sparkles },
  { a: '/configuracion', texto: 'Configuración de alertas', icono: Settings2, global: true },
  { a: '/usuarios', texto: 'Usuarios', icono: Users, global: true },
  { a: '/bitacora', texto: 'Bitácora', icono: ScrollText, global: true },
]

export function Logo({ claro }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-10 items-center justify-center rounded-xl bg-white/10">
        <BookOpenCheck className={clsx('size-5', claro ? 'text-white' : 'text-marca-700')} aria-hidden />
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-400" />
      </div>
      <div className="leading-tight">
        <div className={clsx('font-bold', claro ? 'text-white' : 'text-marca-900')}>SIAC Monitor</div>
        <div className={clsx('text-xs', claro ? 'text-marca-200' : 'text-slate-500')}>Campus Pasto</div>
      </div>
    </div>
  )
}

function Navegacion({ alCambiar }: { alCambiar?: () => void }) {
  const { esGlobal } = useSesion()
  const { data: conteo } = useQuery({
    queryKey: ['alertas', 'conteo'],
    queryFn: () => api.get<{ total: number; altas: number }>('alertas/conteo/'),
    refetchInterval: 120_000,
  })
  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-1 px-3">
      {NAV.filter((n) => !n.global || esGlobal).map((n) => (
        <NavLink
          key={n.a}
          to={n.a}
          end={n.fin}
          onClick={alCambiar}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive ? 'bg-white/15 text-white' : 'text-marca-100/80 hover:bg-white/5 hover:text-white',
            )
          }
        >
          <n.icono className="size-[18px] shrink-0" aria-hidden />
          <span className="flex-1">{n.texto}</span>
          {n.a === '/alertas' && !!conteo?.altas && (
            <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white" title="Alertas altas activas">
              {conteo.altas}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function MenuUsuario() {
  const { usuario, cerrar } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navegar = useNavigate()
  useEffect(() => {
    const fn = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAbierto(false)
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  if (!usuario) return null
  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
      >
        <Avatar iniciales={usuario.iniciales} />
        <div className="hidden text-left leading-tight md:block">
          <div className="text-sm font-semibold text-slate-800">{usuario.nombre}</div>
          <div className="text-xs text-slate-500">{usuario.cargo || usuario.rol_display}</div>
        </div>
        <ChevronDown className="size-4 text-slate-400" aria-hidden />
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <div className="px-3 py-2 text-xs text-slate-500">
            {usuario.email}
            <div className="mt-0.5 font-medium text-slate-700">{usuario.rol_display}</div>
          </div>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => {
              setAbierto(false)
              navegar('/perfil')
            }}
          >
            <KeyRound className="size-4" /> Cambiar contraseña
          </button>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
            onClick={() => void cerrar().then(() => navegar('/ingresar'))}
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const [menu, setMenu] = useState(false)
  const [q, setQ] = useState('')
  const navegar = useNavigate()
  const location = useLocation()
  const { data: conteo } = useQuery({
    queryKey: ['alertas', 'conteo'],
    queryFn: () => api.get<{ total: number; altas: number; mias: number }>('alertas/conteo/'),
    refetchInterval: 120_000,
  })

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim()) navegar(`/indicadores?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="flex min-h-full">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
        Saltar al contenido
      </a>
      {/* Barra lateral fija en escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-marca-800 lg:flex">
        <div className="px-5 py-5">
          <Logo claro />
        </div>
        <div className="flex-1 overflow-y-auto pb-6">
          <Navegacion />
        </div>
        <p className="px-5 pb-4 text-[11px] leading-snug text-marca-200/70">Universidad Cooperativa de Colombia</p>
      </aside>

      {/* Menú deslizable en móvil y tableta */}
      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenu(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-marca-800">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo claro />
              <button onClick={() => setMenu(false)} className="rounded-lg p-1 text-marca-100 hover:bg-white/10" aria-label="Cerrar menú">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-6">
              <Navegacion alCambiar={() => setMenu(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú">
            <Menu className="size-5" />
          </button>
          <form onSubmit={buscar} className="relative hidden max-w-md flex-1 sm:block" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              className="campo pl-9"
              placeholder="Buscar indicador por código o nombre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar indicador"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/alertas?mias=1"
              className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"
              aria-label={`Alertas asignadas a mí: ${conteo?.mias ?? 0}`}
              title="Alertas asignadas a mí"
            >
              <Bell className="size-5" />
              {!!conteo?.mias && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {conteo.mias}
                </span>
              )}
            </Link>
            <MenuUsuario />
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
