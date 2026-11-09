import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProveedorSesion, useSesion } from './auth/AuthContext'
import { ProveedorAvisos } from './components/avisos'
import Layout from './components/Layout'
import { Cargando } from './components/ui'
import Login from './pages/Login'

const Inicio = lazy(() => import('./pages/Inicio'))
const Programas = lazy(() => import('./pages/Programas'))
const ProgramaDetalle = lazy(() => import('./pages/Programas').then((m) => ({ default: m.ProgramaDetalle })))
const Indicadores = lazy(() => import('./pages/Indicadores'))
const IndicadorDetalle = lazy(() => import('./pages/IndicadorDetalle'))
const Evidencias = lazy(() => import('./pages/Evidencias'))
const Alertas = lazy(() => import('./pages/Alertas'))
const Planes = lazy(() => import('./pages/Planes'))
const Reportes = lazy(() => import('./pages/Reportes'))
const Asistente = lazy(() => import('./pages/Asistente'))
const Configuracion = lazy(() => import('./pages/Configuracion'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Bitacora = lazy(() => import('./pages/Bitacora'))
const Perfil = lazy(() => import('./pages/Perfil'))

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: (n, e) => n < 1 && !(e as { estado?: number }).estado, refetchOnWindowFocus: false },
  },
})

function Protegida({ children, global }: { children: ReactNode; global?: boolean }) {
  const { usuario, cargando, esGlobal } = useSesion()
  const loc = useLocation()
  if (cargando) return <Cargando texto="Verificando sesión…" />
  if (!usuario) return <Navigate to="/ingresar" state={{ desde: loc.pathname + loc.search }} replace />
  if (global && !esGlobal) return <Navigate to="/" replace />
  return <>{children}</>
}

function NoEncontrada() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl font-bold text-marca-200">404</p>
      <p className="mt-2 text-slate-600">La página no existe.</p>
      <Link to="/" className="btn-primario mt-6">Ir al inicio</Link>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorSesion>
        <ProveedorAvisos>
          <BrowserRouter>
            <Suspense fallback={<Cargando />}>
              <Routes>
                <Route path="/ingresar" element={<Login />} />
                <Route element={<Protegida><Layout /></Protegida>}>
                  <Route index element={<Inicio />} />
                  <Route path="programas" element={<Programas />} />
                  <Route path="programas/:id" element={<ProgramaDetalle />} />
                  <Route path="indicadores" element={<Indicadores />} />
                  <Route path="indicadores/:id" element={<IndicadorDetalle />} />
                  <Route path="evidencias" element={<Evidencias />} />
                  <Route path="alertas" element={<Alertas />} />
                  <Route path="planes" element={<Planes />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="asistente" element={<Asistente />} />
                  <Route path="perfil" element={<Perfil />} />
                  <Route path="configuracion" element={<Protegida global><Configuracion /></Protegida>} />
                  <Route path="usuarios" element={<Protegida global><Usuarios /></Protegida>} />
                  <Route path="bitacora" element={<Protegida global><Bitacora /></Protegida>} />
                  <Route path="*" element={<NoEncontrada />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ProveedorAvisos>
      </ProveedorSesion>
    </QueryClientProvider>
  )
}
