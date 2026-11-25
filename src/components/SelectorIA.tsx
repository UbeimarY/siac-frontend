import clsx from 'clsx'
import { BrainCircuit, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { ModoIA } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'

const EVENTO = 'siac:modo-ia'

function leer(clave: string): ModoIA {
  try {
    return localStorage.getItem(clave) === 'beta' ? 'beta' : 'estandar'
  } catch {
    return 'estandar'
  }
}

/** Preferencia de IA de cada usuario (estándar o Beta), recordada en este navegador y compartida entre pantallas. */
export function useModoIA(): [ModoIA, (m: ModoIA) => void] {
  const { usuario } = useSesion()
  const clave = `siac.modoIA.${usuario?.id ?? 'anonimo'}`
  const [modo, setModo] = useState<ModoIA>(() => leer(clave))
  useEffect(() => {
    setModo(leer(clave))
    const alCambiar = () => setModo(leer(clave))
    window.addEventListener(EVENTO, alCambiar)
    return () => window.removeEventListener(EVENTO, alCambiar)
  }, [clave])
  const cambiar = useCallback((m: ModoIA) => {
    try {
      localStorage.setItem(clave, m)
    } catch {
      /* sin almacenamiento: solo se cambia en esta pantalla */
    }
    setModo(m)
    window.dispatchEvent(new Event(EVENTO))
  }, [clave])
  return [modo, cambiar]
}

/** Interruptor «IA estándar / IA Beta» que aparece en cada pantalla donde se usa IA. */
export function SelectorIA({ chico, estandarDisponible = true }: { chico?: boolean; estandarDisponible?: boolean }) {
  const [modo, cambiar] = useModoIA()
  const opciones = [
    { valor: 'estandar' as const, texto: 'IA estándar', icono: Sparkles, ayuda: estandarDisponible ? 'Modelo de lenguaje en la nube (Groq)' : 'No configurada en el servidor' },
    { valor: 'beta' as const, texto: 'IA Beta', icono: BrainCircuit, ayuda: 'Red neuronal propia, entrenada desde cero' },
  ]
  return (
    <div role="radiogroup" aria-label="Motor de IA" className={clsx('inline-flex self-end rounded-xl border border-slate-200 bg-slate-50 p-0.5', chico ? 'text-xs' : 'text-sm')}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={modo === o.valor} title={o.ayuda} onClick={() => cambiar(o.valor)}
          className={clsx('inline-flex items-center gap-1.5 rounded-lg font-medium transition', chico ? 'px-2 py-1' : 'px-3 py-1.5',
            modo === o.valor ? (o.valor === 'beta' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-violet-600 text-white shadow-sm') : 'text-slate-600 hover:text-slate-900')}>
          <o.icono className={chico ? 'size-3.5' : 'size-4'} /> {o.texto}
          {o.valor === 'beta' && <span className={clsx('rounded px-1 text-[10px] font-semibold uppercase', modo === 'beta' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700')}>beta</span>}
        </button>
      ))}
    </div>
  )
}
