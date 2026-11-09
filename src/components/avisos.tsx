import clsx from 'clsx'
import { CheckCircle2, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Aviso = { id: number; tipo: 'ok' | 'error'; texto: string }
const Ctx = createContext<(texto: string, tipo?: Aviso['tipo']) => void>(() => {})

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const avisar = useCallback((texto: string, tipo: Aviso['tipo'] = 'ok') => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, tipo, texto }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'error' ? 7000 : 4000)
  }, [])
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-2" aria-live="polite">
        {avisos.map((a) => (
          <div
            key={a.id}
            className={clsx(
              'pointer-events-auto flex items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-lg ring-1',
              a.tipo === 'ok' ? 'bg-white text-slate-800 ring-green-200' : 'bg-red-50 text-red-800 ring-red-200',
            )}
          >
            {a.tipo === 'ok' ? <CheckCircle2 className="size-5 shrink-0 text-green-600" /> : <XCircle className="size-5 shrink-0" />}
            {a.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAvisos = () => useContext(Ctx)
