import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BrainCircuit, Cpu, Loader2, MessagesSquare, RefreshCw, TrendingUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/cliente'
import { useEstadoIABeta, usePrediccionesBeta, useProgramas } from '../api/consultas'
import type { MetricasClasificacion, ModeloBeta } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Barra, Cargando, Encabezado, Insignia, MensajeError, Selector, Vacio } from '../components/ui'
import { fechaHora, NIVEL, probabilidadTexto } from '../lib/formato'

// Paleta categórica validada (azul / naranja) para las dos curvas de pérdida.
const SERIE_ENTRENAMIENTO = '#2a78d6'
const SERIE_VALIDACION = '#eb6834'

const pct = (v: number | undefined) => (v === undefined || v === null ? '—' : `${(v * 100).toFixed(1)}%`)

/** Valor de una métrica para la tabla: el Brier se muestra como número y el resto como porcentaje. */
function valorMetrica(m: MetricasClasificacion | undefined, k: keyof MetricasClasificacion): string {
  if (!m) return '—'
  const v = m[k] as number | undefined
  if (k === 'brier') return v === undefined ? '—' : v.toFixed(3)
  return pct(v)
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <div><dt className="text-xs text-slate-500">{etiqueta}</dt><dd className="font-semibold text-slate-800">{children}</dd></div>
}

function FichaModelo({ m }: { m: ModeloBeta }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <Dato etiqueta="Arquitectura"><span className="font-mono text-xs">{m.arquitectura}</span></Dato>
      <Dato etiqueta="Parámetros">{m.parametros.toLocaleString('es-CO')}</Dato>
      <Dato etiqueta="Versión">v{m.version}</Dato>
      <Dato etiqueta="Entrenada">{fechaHora(m.entrenado)} · {m.entrenado_por}</Dato>
    </dl>
  )
}

function CurvaPerdida({ m }: { m: ModeloBeta }) {
  const h = m.historial
  if (!h || !h.perdida?.length) return null
  const datos = h.perdida.map((p, k) => ({ epoca: k + 1, entrenamiento: +p.toFixed(4), validacion: h.perdida_val?.[k] !== undefined ? +h.perdida_val[k].toFixed(4) : undefined }))
  return (
    <div className="mt-5">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">Curva de aprendizaje</h3>
      <p className="mb-2 text-xs text-slate-500">Pérdida (entropía cruzada) por época. El entrenamiento se detiene cuando la validación deja de mejorar y se conservan los pesos de la mejor época.</p>
      <div className="h-56" role="img" aria-label={`Curva de pérdida del modelo ${m.tipo}: mejor época ${h.mejor_epoca + 1}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#eef0f3" vertical={false} />
            <XAxis dataKey="epoca" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" label={{ value: 'época', position: 'insideBottomRight', offset: -2, fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" width={48} />
            <Tooltip formatter={(v) => (v as number).toFixed(4)} labelFormatter={(e) => `Época ${e}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={h.mejor_epoca + 1} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'mejor época', fontSize: 11, fill: '#64748b', position: 'top' }} />
            <Line type="monotone" dataKey="entrenamiento" name="Entrenamiento" stroke={SERIE_ENTRENAMIENTO} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="validacion" name="Validación" stroke={SERIE_VALIDACION} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const FILAS: [keyof MetricasClasificacion, string, string][] = [
  ['exactitud', 'Exactitud', 'Proporción de aciertos'],
  ['precision', 'Precisión', 'De los que predijo «incumple», cuántos incumplieron'],
  ['sensibilidad', 'Sensibilidad', 'De los que incumplieron, cuántos detectó'],
  ['f1', 'F1', 'Equilibrio entre precisión y sensibilidad'],
  ['brier', 'Brier (menor es mejor)', 'Error de las probabilidades'],
]

function ModeloRiesgo({ m }: { m: ModeloBeta }) {
  const v = m.metricas.validacion
  const b = m.metricas.linea_base
  const supera = b && v.f1 !== undefined && b.f1 !== undefined && v.brier !== undefined && b.brier !== undefined
    ? v.f1 > b.f1 + 0.005 || v.brier < b.brier - 0.005
    : null
  return (
    <section className="tarjeta p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-marca-900"><TrendingUp className="size-4 text-emerald-600" /> Predictor de incumplimiento</h2>
      <p className="mb-4 text-sm text-slate-600">
        Con los últimos valores de cada indicador ({m.metricas.indicadores} indicadores, {m.muestras_entrenamiento} pares de periodos consecutivos) estima la probabilidad de que el próximo valor no cumpla la meta.
      </p>
      <FichaModelo m={m} />
      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Desempeño en datos no vistos</h3>
      <p className="mb-2 text-xs text-slate-500">{m.metricas.metodo_validacion}. Se compara con una regla simple: «el próximo periodo repetirá el estado actual».</p>
      <div className="overflow-x-auto">
        <table className="tabla">
          <thead><tr><th>Métrica</th><th className="text-right">Red neuronal</th><th className="text-right">Regla simple</th></tr></thead>
          <tbody>
            {FILAS.map(([k, texto, ayuda]) => (
              <tr key={k}>
                <td><span title={ayuda}>{texto}</span></td>
                <td className="text-right font-semibold">{valorMetrica(v, k)}</td>
                <td className="text-right text-slate-600">{valorMetrica(b, k)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {supera !== null && (
        <p className={`mt-3 rounded-lg p-3 text-sm ${supera ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
          {supera
            ? 'Con los datos actuales la red neuronal supera a la regla simple.'
            : 'Con los datos actuales la red neuronal rinde parecido a la regla simple: el histórico todavía es corto y casi siempre el estado se repite. Su valor aumentará a medida que se carguen más periodos (por ejemplo, con los datos reales del piloto); vuelva a entrenarla después de cada carga.'}
        </p>
      )}
      <CurvaPerdida m={m} />
    </section>
  )
}

function ModeloIntencion({ m, etiquetas }: { m: ModeloBeta; etiquetas: Record<string, string> }) {
  const por = m.metricas.por_intencion ?? {}
  return (
    <section className="tarjeta p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-marca-900"><MessagesSquare className="size-4 text-emerald-600" /> Clasificador de preguntas del asistente</h2>
      <p className="mb-4 text-sm text-slate-600">
        Convierte la pregunta en un vector de palabras y fragmentos de palabras y decide entre {Object.keys(etiquetas).length} intenciones. Se entrenó con {m.metricas.frases} frases de ejemplo escritas para el SIAC (con variantes).
      </p>
      <FichaModelo m={m} />
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Dato etiqueta="Exactitud en validación">{pct(m.metricas.validacion.exactitud)}</Dato>
        <Dato etiqueta="Exactitud en entrenamiento">{pct(m.metricas.entrenamiento.exactitud)}</Dato>
        <Dato etiqueta="Confianza mínima para responder">{pct(m.metricas.umbral_confianza)}</Dato>
      </dl>
      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Aciertos por intención (validación)</h3>
      <ul className="space-y-2">
        {Object.entries(etiquetas).map(([k, texto]) => (
          <li key={k} className="grid grid-cols-[minmax(0,11rem)_1fr_3rem] items-center gap-3 text-sm">
            <span className="truncate text-slate-700" title={texto}>{texto}</span>
            <Barra valor={(por[k] ?? 0) * 100} color="#2a78d6" />
            <span className="text-right tabular-nums text-slate-600">{por[k] === null || por[k] === undefined ? '—' : `${Math.round((por[k] as number) * 100)}%`}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">{m.metricas.metodo_validacion}. Si la confianza queda por debajo del umbral, el asistente no adivina: propone preguntas parecidas.</p>
      <CurvaPerdida m={m} />
    </section>
  )
}

function Predicciones() {
  const { data: progs } = useProgramas()
  const [programa, setPrograma] = useState('')
  const [nivel, setNivel] = useState('')
  const [todos, setTodos] = useState(false)
  const q = usePrediccionesBeta(programa ? { programa } : {})
  const todas = (q.data?.resultados ?? []).filter((r) => !nivel || r.nivel === nivel)
  const filas = todos ? todas : todas.slice(0, 15)
  return (
    <section className="tarjeta">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-3">
        <div>
          <h2 className="font-semibold text-marca-900">Pronóstico por indicador</h2>
          <p className="text-sm text-slate-500">Probabilidad de que el próximo valor registrado no cumpla la meta.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Selector etiqueta="Programa" valor={programa} cambiar={setPrograma} todos="Todos" opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
          <Selector etiqueta="Nivel" valor={nivel} cambiar={setNivel} todos="Todos" opciones={(['ALTO', 'MEDIO', 'BAJO'] as const).map((n) => ({ valor: n, texto: NIVEL[n].texto }))} />
        </div>
      </div>
      {(() => {
        if (q.isLoading) return <Cargando />
        if (q.error) return <MensajeError error={q.error} />
        if (!q.data?.modelo) return <div className="p-5"><Vacio titulo="El modelo todavía no está entrenado" icono={<BrainCircuit className="size-10" />} /></div>
        if (filas.length === 0) return <p className="px-5 pb-5 text-sm text-slate-500">No hay indicadores con ese filtro.</p>
        return (
        <div className="overflow-x-auto">
          <table className="tabla">
            <thead><tr><th>Indicador</th><th>Programa</th><th className="w-48">Probabilidad</th><th>Nivel</th><th>Señal principal</th></tr></thead>
            <tbody>
              {filas.map((r) => (
                <tr key={r.indicador}>
                  <td><Link to={`/indicadores/${r.indicador}`} className="font-medium text-marca-700 hover:underline">{r.codigo}</Link> <span className="text-slate-600">{r.nombre}</span></td>
                  <td className="whitespace-nowrap">{r.programa}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Barra valor={r.probabilidad * 100} color={NIVEL[r.nivel].color} /></div>
                      <span className="w-12 text-right tabular-nums">{probabilidadTexto(r.probabilidad)}</span>
                    </div>
                  </td>
                  <td><Insignia clase={NIVEL[r.nivel].clase}>{NIVEL[r.nivel].texto}</Insignia></td>
                  <td className="text-sm text-slate-600">{r.factores[0] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {todas.length > 15 && (
            <div className="border-t border-slate-100 p-3 text-center">
              <button className="text-sm font-medium text-marca-700 hover:underline" onClick={() => setTodos(!todos)}>
                {todos ? 'Mostrar solo los 15 más probables' : `Ver los ${todas.length} indicadores`}
              </button>
            </div>
          )}
        </div>
        )
      })()}
    </section>
  )
}

export default function IABeta() {
  const { esGlobal } = useSesion()
  const avisar = useAvisos()
  const qc = useQueryClient()
  const q = useEstadoIABeta()
  const entrenar = useMutation({
    mutationFn: () => api.post<{ modelos: Record<string, ModeloBeta>; errores: Record<string, string> }>('ia/beta/entrenar/', { modelo: 'TODOS' }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['ia-beta'] })
      const v = Object.values(r.modelos).map((m) => `${m.tipo === 'RIESGO' ? 'predictor' : 'asistente'} v${m.version}`).join(' y ')
      avisar(`IA Beta reentrenada: ${v}.${Object.keys(r.errores).length ? ' ' + Object.values(r.errores).join(' ') : ''}`)
    },
    onError: (e) => avisar(e.message, 'error'),
  })
  if (q.isLoading) return <Cargando />
  if (q.error) return <MensajeError error={q.error} reintentar={() => void q.refetch()} />
  const d = q.data!
  return (
    <>
      <Encabezado titulo="IA Beta"
        subtitulo="Red neuronal propia del SIAC, programada y entrenada desde cero (NumPy), sin servicios externos."
        acciones={esGlobal && (
          <button className="btn bg-emerald-600 text-white hover:bg-emerald-700" disabled={entrenar.isPending} onClick={() => entrenar.mutate()}>
            {entrenar.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Entrenar con los datos actuales
          </button>
        )} />
      <div className="tarjeta mb-6 flex items-start gap-3 p-5 text-sm text-slate-700">
        <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><Cpu className="size-5" /></span>
        <div className="space-y-1">
          <p>Cada red está hecha de capas densas con activación ReLU, se entrena con retropropagación y el optimizador Adam, y usa regularización, <em>dropout</em> y parada temprana. Los pesos se guardan en la base de datos con número de versión.</p>
          <p className="text-slate-500">Úsela desde el <Link to="/asistente" className="text-emerald-700 underline">Asistente</Link> (selector «IA Beta») o en el detalle de cada indicador. Es una función en prueba: sus resultados apoyan la revisión, no la reemplazan.</p>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {d.riesgo ? <ModeloRiesgo m={d.riesgo} /> : <section className="tarjeta p-5"><Vacio titulo="Predictor sin entrenar" icono={<TrendingUp className="size-10" />}>Se necesitan al menos 20 pares de periodos consecutivos con valores que cumplan y que no cumplan la meta.</Vacio></section>}
        {d.intencion ? <ModeloIntencion m={d.intencion} etiquetas={d.intenciones} /> : <section className="tarjeta p-5"><Vacio titulo="Asistente sin entrenar" icono={<MessagesSquare className="size-10" />} /></section>}
      </div>
      <Predicciones />
    </>
  )
}
