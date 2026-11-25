import { useMutation } from '@tanstack/react-query'
import { Bot, BrainCircuit, Loader2, Send, Sparkles, Trash2 } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/cliente'
import { useEstadoIA, useEstadoIABeta, useProgramas } from '../api/consultas'
import type { ModoIA, RespuestaBeta } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { SelectorIA, useModoIA } from '../components/SelectorIA'
import { Cargando, Encabezado, Selector, Vacio } from '../components/ui'

type Mensaje = { role: 'user' | 'assistant'; content: string; motor?: ModoIA; beta?: RespuestaBeta }

const SUGERENCIAS: Record<ModoIA, string[]> = {
  estandar: [
    '¿Qué programas tienen mayor riesgo y por qué?',
    '¿Qué evidencias faltan antes de la visita de pares de Medicina?',
    '¿Cuáles acciones de mejoramiento están retrasadas?',
    'Resume el estado de Enfermería en tres puntos.',
  ],
  beta: [
    '¿Qué indicadores podrían incumplir el próximo periodo?',
    '¿Qué vence esta semana?',
    '¿Qué alertas altas hay?',
    '¿Qué programa tiene más riesgo?',
  ],
}

/** Negritas (**…**) y cursivas (_…_) dentro de una línea. */
function enLinea(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|_[^_]+_)/).map((p, k) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={k}>{p.slice(2, -2)}</strong>
    if (p.length > 2 && p.startsWith('_') && p.endsWith('_')) return <em key={k} className="text-slate-600">{p.slice(1, -1)}</em>
    return <Fragment key={k}>{p}</Fragment>
  })
}

/** Texto con formato mínimo: párrafos, títulos con #, listas con guion o número (también mezcladas con texto). */
function Texto({ t }: { t: string }) {
  const bloques: ReactNode[] = []
  let lista: { ordenada: boolean; items: string[] } | null = null
  const cerrarLista = () => {
    if (!lista) return
    const items = lista.items.map((l, k) => <li key={k}>{enLinea(l)}</li>)
    bloques.push(lista.ordenada
      ? <ol key={bloques.length} className="list-decimal space-y-1 pl-5">{items}</ol>
      : <ul key={bloques.length} className="list-disc space-y-1 pl-5">{items}</ul>)
    lista = null
  }
  for (const linea of t.split('\n')) {
    const m = linea.match(/^\s*([-*•]|\d+\.)\s+(.*)$/)
    if (m) {
      const ordenada = /\d/.test(m[1])
      if (!lista || lista.ordenada !== ordenada) { cerrarLista(); lista = { ordenada, items: [] } }
      lista.items.push(m[2])
      continue
    }
    cerrarLista()
    if (!linea.trim()) continue
    const titulo = linea.match(/^#{1,6}\s+(.*)$/)
    bloques.push(titulo
      ? <p key={bloques.length} className="font-semibold">{enLinea(titulo[1])}</p>
      : <p key={bloques.length} className="whitespace-pre-wrap">{enLinea(linea)}</p>)
  }
  cerrarLista()
  return <div className="space-y-2">{bloques}</div>
}

function DetalleBeta({ r, enviar }: { r: RespuestaBeta; enviar: (s: string) => void }) {
  return (
    <div className="mt-2 border-t border-slate-200 pt-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1 font-medium text-emerald-700"><BrainCircuit className="size-3.5" /> IA Beta</span>
        {r.etiqueta && <span>Intención: <strong className="text-slate-700">{r.etiqueta}</strong> ({Math.round(r.confianza * 100)}%)</span>}
        {r.programa && <span>Programa: {r.programa}</span>}
      </div>
      {r.sugerencias && r.sugerencias.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.sugerencias.map((s) => <button key={s} onClick={() => enviar(s)} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs text-emerald-800 hover:bg-emerald-50">{s}</button>)}
        </div>
      )}
    </div>
  )
}

export default function Asistente() {
  const { usuario, esGlobal } = useSesion()
  const ia = useEstadoIA()
  const beta = useEstadoIABeta()
  const [modo, setModo] = useModoIA()
  const { data: progs } = useProgramas()
  const [programa, setPrograma] = useState('')
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const fin = useRef<HTMLDivElement>(null)
  const error = (e: Error) => setMensajes((ms) => [...ms, { role: 'assistant', content: `⚠️ ${e.message}` }])
  const estandar = useMutation({
    mutationFn: (hist: Mensaje[]) => api.post<{ respuesta: string }>('ia/asistente/', {
      mensajes: hist.map(({ role, content }) => ({ role, content })), programa: programa || null,
    }),
    onSuccess: (r) => setMensajes((ms) => [...ms, { role: 'assistant', content: r.respuesta, motor: 'estandar' }]),
    onError: error,
  })
  const red = useMutation({
    mutationFn: (pregunta: string) => api.post<RespuestaBeta>('ia/beta/asistente/', { mensaje: pregunta, programa: programa || null }),
    onSuccess: (r) => setMensajes((ms) => [...ms, { role: 'assistant', content: r.respuesta, motor: 'beta', beta: r }]),
    onError: error,
  })
  const pendiente = estandar.isPending || red.isPending
  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, pendiente])

  const enviar = (contenido: string) => {
    const c = contenido.trim()
    if (!c || pendiente) return
    setMensajes((ms) => [...ms, { role: 'user', content: c }])
    setTexto('')
    if (modo === 'beta') {
      red.mutate(c)
    } else {
      // La IA estándar recibe solo su propia conversación (sin errores ni respuestas de la IA Beta).
      const hist = [...mensajes.filter((x) => x.role === 'user' || x.motor === 'estandar'), { role: 'user' as const, content: c }]
      estandar.mutate(hist)
    }
  }
  const onSubmit = (e: FormEvent) => { e.preventDefault(); enviar(texto) }

  if (ia.isLoading || beta.isLoading) return <Cargando />
  const estandarDisponible = !!ia.data?.disponible
  const betaLista = !!beta.data?.intencion
  const bloqueado = modo === 'estandar' ? !estandarDisponible : !betaLista
  const acento = modo === 'beta' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
  const Icono = modo === 'beta' ? BrainCircuit : Sparkles

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <Encabezado titulo="Asistente IA"
        subtitulo={modo === 'beta'
          ? 'IA Beta: una red neuronal propia identifica qué pregunta y la respuesta se arma solo con datos del SIAC que usted puede ver.'
          : 'Pregunte sobre indicadores, alertas, evidencias y planes. Solo usa los datos que usted puede ver.'}
        acciones={<>
          <SelectorIA estandarDisponible={estandarDisponible} />
          <Selector etiqueta="Enfocar en" valor={programa} cambiar={setPrograma} todos="Todos mis programas" opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
          {mensajes.length > 0 && <button className="btn-secundario self-end" onClick={() => setMensajes([])}><Trash2 className="size-4" /> Nueva conversación</button>}
        </>} />
      <div className="tarjeta flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {mensajes.length === 0 && (bloqueado ? (
            modo === 'estandar' ? (
              <Vacio titulo="La IA estándar no está activada" icono={<Bot className="size-10" />}>
                El administrador debe configurar la clave del proveedor de IA en el servidor. Mientras tanto puede usar la{' '}
                <button className="font-medium text-emerald-700 underline" onClick={() => setModo('beta')}>IA Beta</button>, que funciona sin servicios externos.
              </Vacio>
            ) : (
              <Vacio titulo="La IA Beta aún no está entrenada" icono={<BrainCircuit className="size-10" />}>
                {esGlobal ? <>Entrénela desde la página <Link to="/ia-beta" className="font-medium text-emerald-700 underline">IA Beta</Link>; tarda unos segundos.</>
                  : 'Pida a la coordinación de calidad que la entrene desde la página IA Beta.'}
              </Vacio>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className={`mb-3 rounded-2xl p-3 ${acento}`}><Icono className="size-7" /></span>
              <p className="font-medium text-slate-800">Hola, {usuario?.first_name}. ¿Qué quiere saber del SIAC?</p>
              {modo === 'beta' && <p className="mt-1 max-w-lg text-sm text-slate-500">Responde sobre alertas, indicadores, evidencias, vencimientos, planes, predicciones, programas y visitas de pares.</p>}
              <div className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGERENCIAS[modo].map((s) => <button key={s} onClick={() => enviar(s)} className={`rounded-xl border border-slate-200 p-3 text-left text-sm text-slate-700 ${modo === 'beta' ? 'hover:border-emerald-300 hover:bg-emerald-50' : 'hover:border-violet-300 hover:bg-violet-50'}`}>{s}</button>)}
              </div>
            </div>
          ))}
          {mensajes.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start gap-2'}>
              {msg.role === 'assistant' && (
                <span className={`mt-1 self-start rounded-lg p-1.5 ${msg.motor === 'beta' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                  {msg.motor === 'beta' ? <BrainCircuit className="size-4" /> : <Sparkles className="size-4" />}
                </span>
              )}
              <div className={msg.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-marca-700 px-4 py-2.5 text-sm text-white' : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800'}>
                {msg.role === 'user' ? msg.content : <Texto t={msg.content} />}
                {msg.beta && <DetalleBeta r={msg.beta} enviar={enviar} />}
              </div>
            </div>
          ))}
          {pendiente && (
            <div className={`flex items-center gap-2 text-sm ${modo === 'beta' ? 'text-emerald-700' : 'text-violet-700'}`}>
              <Loader2 className="size-4 animate-spin" /> {modo === 'beta' ? 'La red neuronal está analizando la pregunta…' : 'Consultando los datos del SIAC…'}
            </div>
          )}
          <div ref={fin} />
        </div>
        <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-100 p-3">
          <input className="campo" placeholder={bloqueado ? 'Cambie de IA para escribir…' : 'Escriba su pregunta…'} value={texto} disabled={bloqueado}
            onChange={(e) => setTexto(e.target.value)} maxLength={modo === 'beta' ? 1000 : 2000} aria-label="Pregunta para el asistente" />
          <button className={modo === 'beta' ? 'btn bg-emerald-600 text-white hover:bg-emerald-700' : 'btn-ia'} disabled={bloqueado || !texto.trim() || pendiente} aria-label="Enviar"><Send className="size-4" /></button>
        </form>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">
        {modo === 'beta'
          ? 'La IA Beta no redacta con un modelo de lenguaje: las cifras salen directamente de la base de datos. Las predicciones son estimaciones estadísticas.'
          : 'Las respuestas se generan con IA y pueden contener errores. Verifique las cifras en los módulos correspondientes.'}
      </p>
    </div>
  )
}
