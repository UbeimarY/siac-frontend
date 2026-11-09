import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../auth/AuthContext'
import { Logo } from '../components/Layout'

export default function Login() {
  const { usuario, iniciar } = useSesion()
  const navegar = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const destino = (loc.state as { desde?: string } | null)?.desde ?? '/'

  if (usuario) return <Navigate to={destino} replace />

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await iniciar(email.trim(), password)
      navegar(destino, { replace: true })
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 401) setError('Correo o contraseña incorrectos.')
      else setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-marca-800 via-marca-700 to-marca-500 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-2xl bg-marca-700 p-1">
            <Logo claro />
          </div>
          <h1 className="text-2xl font-bold text-marca-900">SIAC Monitor</h1>
          <p className="text-sm text-slate-600">Universidad Cooperativa de Colombia</p>
          <p className="text-xs text-slate-400">Campus Pasto · Sistema Interno de Aseguramiento de la Calidad</p>
        </div>
        <form onSubmit={enviar} className="space-y-4" noValidate>
          <label className="block">
            <span className="etiqueta">Correo institucional</span>
            <input
              type="email"
              className="campo"
              placeholder="nombre@ucc.edu.co"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="etiqueta">Contraseña</span>
            <div className="relative">
              <input
                type={ver ? 'text' : 'password'}
                className="campo pr-10"
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setVer((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primario w-full py-2.5 text-base" disabled={enviando || !email || !password}>
            {enviando && <Loader2 className="size-4 animate-spin" />} Ingresar
          </button>
          <p className="text-center text-xs text-slate-500">
            ¿Olvidó su contraseña? Solicite el restablecimiento a la coordinación de calidad.
          </p>
        </form>
      </div>
    </div>
  )
}
