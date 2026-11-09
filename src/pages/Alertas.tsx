import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { BellOff, CheckCheck, ClipboardPlus, Loader2, RefreshCw, Sparkles, User } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/cliente'
import { useEstadoIA, useProgramas } from '../api/consultas'
import type { Alerta, SugerenciaPlan } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Campo, Cargando, Encabezado, Filtros, Insignia, MensajeError, Modal, Selector, Vacio } from '../components/ui'
import { fecha, fechaHora, SEVERIDAD } from '../lib/formato'
import { FormularioPlan, type BorradorPlan } from './Planes'

const TIPOS: Record<string, string> = {
  BAJO_META: 'Valor bajo la meta', EVIDENCIA_FALTANTE: 'Evidencia faltante', DESACTUALIZADO: 'Indicador sin actualizar',
  VENCIMIENTO: 'Reporte o evidencia vencida', PLAN_RETRASADO: 'Acción retrasada', TENDENCIA: 'Tendencia en deterioro',
}

function Cerrar({ alerta, accion, cerrar }: { alerta: Alerta; accion: 'atender' | 'descartar'; cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const [c, setC] = useState('')
  const m = useMutation({
    mutationFn: () => api.post(`alertas/${alerta.id}/${accion}/`, { comentario: c }),
    onSuccess: () => { void qc.invalidateQueries(); avisar(accion === 'atender' ? 'Alerta marcada como atendida.' : 'Alerta descartada.'); cerrar() },
    onError: (e) => avisar(e.message, 'error'),
  })
  return (
    <Modal abierto cerrar={cerrar} titulo={accion === 'atender' ? 'Marcar como atendida' : 'Descartar alerta'} pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cancelar</button>
      <button className={accion === 'atender' ? 'btn-primario' : 'btn-peligro'} disabled={m.isPending || (accion === 'descartar' && !c.trim())} onClick={() => m.mutate()}>Confirmar</button></>}>
      <p className="mb-3 text-sm text-slate-700">{alerta.titulo}</p>
      {accion === 'atender' && <p className="mb-3 text-xs text-slate-500">Si la condición persiste, el motor volverá a generar la alerta en el próximo cálculo.</p>}
      {accion === 'descartar' && <p className="mb-3 text-xs text-slate-500">Una alerta descartada no se vuelve a generar mientras la condición se mantenga.</p>}
      <Campo etiqueta={accion === 'descartar' ? 'Motivo *' : 'Comentario'}><textarea rows={3} className="campo" value={c} onChange={(e) => setC(e.target.value)} /></Campo>
    </Modal>
  )
}

function SugerenciasIA({ alerta, cerrar, elegir }: { alerta: Alerta; cerrar: () => void; elegir: (b: BorradorPlan) => void }) {
  const q = useQuery({
    queryKey: ['ia', 'sugerir', alerta.id],
    queryFn: () => api.post<{ acciones: SugerenciaPlan[]; justificacion: string; programa: number; indicador: number | null }>('ia/sugerir-plan/', { alerta: alerta.id }),
    retry: false, staleTime: Infinity,
  })
  return (
    <Modal abierto cerrar={cerrar} titulo="Acciones sugeridas con IA" ancho="max-w-2xl" pie={<button className="btn-secundario" onClick={cerrar}>Cerrar</button>}>
      <p className="mb-4 text-sm text-slate-600">{alerta.titulo}</p>
      {q.isLoading && <div className="flex items-center gap-2 py-10 text-sm text-violet-700"><Loader2 className="size-5 animate-spin" /> Analizando la alerta, el histórico y los planes existentes…</div>}
      {q.error && <MensajeError error={q.error} reintentar={() => q.refetch()} />}
      {q.data && (
        <div className="space-y-3">
          {q.data.justificacion && <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-900">{q.data.justificacion}</p>}
          {q.data.acciones.map((a, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <p className="font-medium text-slate-800">{a.accion}</p>
              <p className="mt-1 text-sm text-slate-600">{a.descripcion}</p>
              <p className="mt-2 text-xs text-slate-500">Meta: {a.meta_esperada} · Plazo: hasta {fecha(a.fecha_limite)} · Responsable sugerido: {a.rol_responsable}</p>
              <button className="btn-primario btn-chico mt-3" onClick={() => elegir({
                programa: q.data.programa, indicador: q.data.indicador, alerta_origen: alerta.id, accion: a.accion,
                descripcion: a.descripcion, meta_esperada: a.meta_esperada, fecha_inicio: a.fecha_inicio, fecha_limite: a.fecha_limite, generado_con_ia: true,
              })}><ClipboardPlus className="size-3.5" /> Usar esta acción</button>
            </div>
          ))}
          <p className="text-xs text-slate-500">Las sugerencias son un apoyo; podrá editarlas antes de registrarlas.</p>
        </div>
      )}
    </Modal>
  )
}

export default function Alertas() {
  const { usuario, esGlobal, soloLectura, tieneRol } = useSesion()
  const qc = useQueryClient()
  const avisar = useAvisos()
  const ia = useEstadoIA()
  const [sp, setSp] = useSearchParams()
  const f = { programa: sp.get('programa') ?? '', severidad: sp.get('severidad') ?? '', tipo: sp.get('tipo') ?? '', estado: sp.get('estado') ?? 'ACTIVA', mias: sp.get('mias') ?? '' }
  const setF = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }
  const { data: progs } = useProgramas()
  const q = useQuery({ queryKey: ['alertas', f], queryFn: () => api.get<Alerta[]>('alertas/', f) })
  const [cerrar, setCerrar] = useState<{ a: Alerta; accion: 'atender' | 'descartar' } | null>(null)
  const [sugerir, setSugerir] = useState<Alerta | null>(null)
  const [plan, setPlan] = useState<BorradorPlan | null>(null)
  const recalcular = useMutation({
    mutationFn: () => api.post<{ creadas: number; resueltas: number }>('alertas/recalcular/'),
    onSuccess: (r) => { void qc.invalidateQueries(); avisar(`Motor ejecutado: ${r.creadas} nuevas, ${r.resueltas} resueltas.`) },
    onError: (e) => avisar(e.message, 'error'),
  })
  const puedeGestionar = (a: Alerta) => !soloLectura && (esGlobal || tieneRol('DIRECTOR') || a.responsable === usuario?.id)
  const puedePlan = tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR')

  return (
    <>
      <Encabezado titulo="Centro de alertas" subtitulo={`${q.data?.length ?? 0} alertas ${f.estado === 'ACTIVA' ? 'activas' : ''}`}
        acciones={esGlobal && <button className="btn-secundario" disabled={recalcular.isPending} onClick={() => recalcular.mutate()}>
          <RefreshCw className={clsx('size-4', recalcular.isPending && 'animate-spin')} /> Ejecutar motor</button>} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {['', 'ALTA', 'MEDIA', 'BAJA'].map((s) => (
          <button key={s} onClick={() => setF('severidad', s)} aria-pressed={f.severidad === s}
            className={clsx('rounded-full px-3 py-1 text-sm font-medium', f.severidad === s ? 'bg-marca-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}>
            {s ? SEVERIDAD[s as 'ALTA'].texto : 'Todas'}
          </button>
        ))}
        <button onClick={() => setF('mias', f.mias ? '' : '1')} aria-pressed={!!f.mias}
          className={clsx('inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium', f.mias ? 'bg-marca-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}>
          <User className="size-3.5" /> Asignadas a mí
        </button>
      </div>
      <Filtros>
        <Selector etiqueta="Programa" valor={f.programa} cambiar={(v) => setF('programa', v)} opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
        <Selector etiqueta="Tipo" valor={f.tipo} cambiar={(v) => setF('tipo', v)} opciones={Object.entries(TIPOS).map(([k, v]) => ({ valor: k, texto: v }))} />
        <Selector etiqueta="Estado" valor={f.estado} todos={null} cambiar={(v) => setF('estado', v)} opciones={[{ valor: 'ACTIVA', texto: 'Activas' }, { valor: 'ATENDIDA', texto: 'Atendidas' }, { valor: 'RESUELTA', texto: 'Resueltas automáticamente' }, { valor: 'DESCARTADA', texto: 'Descartadas' }]} />
      </Filtros>
      {q.isLoading && <Cargando />}
      {q.error && <MensajeError error={q.error} />}
      {q.data?.length === 0 && <div className="tarjeta"><Vacio titulo="No hay alertas con estos filtros" icono={<BellOff className="size-10" />} /></div>}
      <div className="space-y-3">
        {q.data?.map((a) => (
          <article key={a.id} className={clsx('tarjeta border-l-4 p-4 sm:p-5', a.severidad === 'ALTA' ? 'border-l-red-500' : a.severidad === 'MEDIA' ? 'border-l-amber-500' : 'border-l-sky-500')}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Insignia clase={SEVERIDAD[a.severidad].clase}>{SEVERIDAD[a.severidad].texto}</Insignia>
                  <span className="text-sm font-semibold text-slate-700">{a.tipo_display}</span>
                  {a.puntaje_riesgo > 0 && <span className="text-xs text-slate-400">riesgo {Math.round(a.puntaje_riesgo)}</span>}
                </div>
                <h3 className="mt-1.5 font-medium text-slate-900">{a.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{a.detalle}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Programa: <Link to={`/programas/${a.programa}`} className="text-marca-600 hover:underline">{a.programa_nombre}</Link></span>
                  {a.indicador && <span>Indicador: <Link to={`/indicadores/${a.indicador}`} className="font-mono text-marca-600 hover:underline">{a.indicador_codigo}</Link></span>}
                  <span>Responsable: {a.responsable_nombre ?? 'sin asignar'}</span>
                  <span>Generada: {fecha(a.fecha_generacion)}</span>
                  {a.planes_asociados.length > 0 && <span>Planes: {a.planes_asociados.map((p) => p.codigo).join(', ')}</span>}
                </div>
                {a.estado !== 'ACTIVA' && <p className="mt-2 text-xs text-slate-500">{a.estado_display} {fechaHora(a.fecha_cierre)}{a.cerrada_por_nombre ? ` por ${a.cerrada_por_nombre}` : ''}{a.comentario_cierre ? ` · ${a.comentario_cierre}` : ''}</p>}
              </div>
              {a.estado === 'ACTIVA' && puedeGestionar(a) && (
                <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
                  {puedePlan && ia.data?.disponible && <button className="btn-ia btn-chico" onClick={() => setSugerir(a)}><Sparkles className="size-3.5" /> Sugerir plan con IA</button>}
                  {puedePlan && <button className="btn-secundario btn-chico" onClick={() => setPlan({ programa: a.programa, indicador: a.indicador, alerta_origen: a.id })}><ClipboardPlus className="size-3.5" /> Crear plan</button>}
                  <button className="btn-secundario btn-chico" onClick={() => setCerrar({ a, accion: 'atender' })}><CheckCheck className="size-3.5" /> Atendida</button>
                  <button className="btn-secundario btn-chico text-slate-500" onClick={() => setCerrar({ a, accion: 'descartar' })}>Descartar</button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {cerrar && <Cerrar alerta={cerrar.a} accion={cerrar.accion} cerrar={() => setCerrar(null)} />}
      {sugerir && <SugerenciasIA alerta={sugerir} cerrar={() => setSugerir(null)} elegir={(b) => { setSugerir(null); setPlan(b) }} />}
      {plan && <FormularioPlan borrador={plan} cerrar={() => setPlan(null)} />}
    </>
  )
}
