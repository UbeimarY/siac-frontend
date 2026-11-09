import { useMutation } from '@tanstack/react-query'
import { Bot, Loader2, Send, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api/cliente'
import { useEstadoIA, useProgramas } from '../api/consultas'
import { useSesion } from '../auth/AuthContext'
import { Cargando, Encabezado, Selector, Vacio } from '../components/ui'

type Mensaje = { role: 'user' | 'assistant'; content: string }

const SUGERENCIAS = [
  '¿Qué programas tienen mayor riesgo y por qué?',
  '¿Qué evidencias faltan antes de la visita de pares de Medicina?',
  '¿Cuáles acciones de mejoramiento están retrasadas?',
  'Resume el estado de Enfermería en tres puntos.',
]

/** Texto con formato mínimo: negritas con ** y listas con guion. */
function Texto({ t }: { t: string }) {
  return (
    <div className="space-y-2">
      {t.split(/\n{2,}/).map((bloque, i) => {
        const lineas = bloque.split('\n')
        const esLista = lineas.every((l) => /^\s*([-*•]|\d+\.)\s/.test(l))
        const fmt = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((p, k) => p.startsWith('**') ? <strong key={k}>{p.slice(2, -2)}</strong> : p)
        return esLista ? (
          <ul key={i} className="list-disc space-y-1 pl-5">{lineas.map((l, k) => <li key={k}>{fmt(l.replace(/^\s*([-*•]|\d+\.)\s/, ''))}</li>)}</ul>
        ) : <p key={i} className="whitespace-pre-wrap">{fmt(bloque)}</p>
      })}
    </div>
  )
}

export default function Asistente() {
  const { usuario } = useSesion()
  const ia = useEstadoIA()
  const { data: progs } = useProgramas()
  const [programa, setPrograma] = useState('')
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const fin = useRef<HTMLDivElement>(null)
  const m = useMutation({
    mutationFn: (hist: Mensaje[]) => api.post<{ respuesta: string }>('ia/asistente/', { mensajes: hist, programa: programa || null }),
    onSuccess: (r) => setMensajes((ms) => [...ms, { role: 'assistant', content: r.respuesta }]),
    onError: (e) => setMensajes((ms) => [...ms, { role: 'assistant', content: `⚠️ ${e.message}` }]),
  })
  useEffect(() => fin.current?.scrollIntoView({ behavior: 'smooth' }), [mensajes, m.isPending])

  const enviar = (contenido: string) => {
    const c = contenido.trim()
    if (!c || m.isPending) return
    const hist = [...mensajes.filter((x) => !x.content.startsWith('⚠️')), { role: 'user' as const, content: c }]
    setMensajes((ms) => [...ms, { role: 'user', content: c }])
    setTexto('')
    m.mutate(hist)
  }
  const onSubmit = (e: FormEvent) => { e.preventDefault(); enviar(texto) }

  if (ia.isLoading) return <Cargando />
  if (!ia.data?.disponible) {
    return (
      <>
        <Encabezado titulo="Asistente IA" />
        <div className="tarjeta"><Vacio titulo="El asistente de IA no está activado" icono={<Bot className="size-10" />}>
          El administrador debe configurar la clave del proveedor de IA en el servidor. El resto del sistema funciona normalmente.
        </Vacio></div>
      </>
    )
  }
  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <Encabezado titulo="Asistente IA" subtitulo="Pregunte sobre indicadores, alertas, evidencias y planes. Solo usa los datos que usted puede ver."
        acciones={<>
          <Selector etiqueta="Enfocar en" valor={programa} cambiar={setPrograma} todos="Todos mis programas" opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
          {mensajes.length > 0 && <button className="btn-secundario self-end" onClick={() => setMensajes([])}><Trash2 className="size-4" /> Nueva conversación</button>}
        </>} />
      <div className="tarjeta flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {mensajes.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="mb-3 rounded-2xl bg-violet-100 p-3 text-violet-700"><Sparkles className="size-7" /></span>
              <p className="font-medium text-slate-800">Hola, {usuario?.first_name}. ¿Qué quiere saber del SIAC?</p>
              <div className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGERENCIAS.map((s) => <button key={s} onClick={() => enviar(s)} className="rounded-xl border border-slate-200 p-3 text-left text-sm text-slate-700 hover:border-violet-300 hover:bg-violet-50">{s}</button>)}
              </div>
            </div>
          )}
          {mensajes.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start gap-2'}>
              {msg.role === 'assistant' && <span className="mt-1 rounded-lg bg-violet-100 p-1.5 text-violet-700"><Sparkles className="size-4" /></span>}
              <div className={msg.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-marca-700 px-4 py-2.5 text-sm text-white' : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800'}>
                {msg.role === 'user' ? msg.content : <Texto t={msg.content} />}
              </div>
            </div>
          ))}
          {m.isPending && <div className="flex items-center gap-2 text-sm text-violet-700"><Loader2 className="size-4 animate-spin" /> Consultando los datos del SIAC…</div>}
          <div ref={fin} />
        </div>
        <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-100 p-3">
          <input className="campo" placeholder="Escriba su pregunta…" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} aria-label="Pregunta para el asistente" />
          <button className="btn-ia" disabled={!texto.trim() || m.isPending} aria-label="Enviar"><Send className="size-4" /></button>
        </form>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">Las respuestas se generan con IA y pueden contener errores. Verifique las cifras en los módulos correspondientes.</p>
    </div>
  )
}
