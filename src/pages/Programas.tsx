import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, Pencil, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/cliente'
import { useProgramas, useResponsables } from '../api/consultas'
import type { Indicador, Programa } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Barra, Campo, Cargando, Encabezado, Insignia, MensajeError, Modal, NivelRiesgo, Vacio } from '../components/ui'
import { ESTADO_INDICADOR, ESTADO_PROGRAMA, fecha, meta, NIVEL, SEVERIDAD, TENDENCIA, valor } from '../lib/formato'

function Visita({ p }: { p: Programa }) {
  if (!p.fecha_visita_pares) return <span className="text-slate-400">Sin visita programada</span>
  const d = p.dias_para_visita ?? 0
  return (
    <span className={d >= 0 && d <= 180 ? 'font-medium text-red-700' : ''}>
      Visita de pares: {fecha(p.fecha_visita_pares)}
      {d >= 0 ? ` (en ${d} días)` : ' (realizada)'}
    </span>
  )
}

export default function Programas() {
  const q = useProgramas()
  return (
    <>
      <Encabezado titulo="Programas académicos" subtitulo="Seleccione un programa para ver su tablero de indicadores" />
      {q.isLoading && <Cargando />}
      {q.error && <MensajeError error={q.error} />}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {q.data?.map((p) => (
          <Link key={p.id} to={`/programas/${p.id}`} className="tarjeta flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-marca-900">{p.nombre}</h2>
                <p className="text-xs text-slate-500">{p.facultad}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: p.nivel ? NIVEL[p.nivel].color : '#94a3b8' }}>
                  {p.riesgo !== null && p.riesgo !== undefined ? Math.round(p.riesgo) : '—'}
                </div>
                <div className="text-[11px] text-slate-400">índice de riesgo</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Insignia clase={ESTADO_PROGRAMA[p.estado]}>{p.estado_display}</Insignia>
              <NivelRiesgo nivel={p.nivel} />
              {p.config_propia && <Insignia clase="bg-violet-50 text-violet-700 ring-violet-200">Pesos propios</Insignia>}
            </div>
            {p.detalle_estado && <p className="mt-2 text-xs text-slate-500">{p.detalle_estado}</p>}
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <div className="flex items-center gap-2"><CalendarClock className="size-4 text-slate-400" /><Visita p={p} /></div>
              <div className="flex items-center gap-2">
                <TriangleAlert className="size-4 text-slate-400" />
                {p.alertas_activas ?? 0} alertas activas{p.alertas_altas ? <span className="font-medium text-red-600"> ({p.alertas_altas} altas)</span> : null}
              </div>
            </div>
            <div className="mt-auto pt-4">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Indicadores al día</span>
                <span>{p.indicadores_al_dia}/{p.indicadores_total}</span>
              </div>
              <Barra valor={p.indicadores_al_dia ?? 0} max={p.indicadores_total || 1} color="#15803d" />
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

function EditarPrograma({ p, cerrar }: { p: Programa; cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const { data: usuarios } = useResponsables()
  const [d, setD] = useState({
    estado: p.estado, detalle_estado: p.detalle_estado, fecha_visita_pares: p.fecha_visita_pares ?? '', director: p.director ?? '',
  })
  const m = useMutation({
    mutationFn: () => api.patch(`programas/${p.id}/`, { ...d, fecha_visita_pares: d.fecha_visita_pares || null, director: d.director || null }),
    onSuccess: () => {
      void qc.invalidateQueries()
      avisar('Programa actualizado. El índice de riesgo se recalculó.')
      cerrar()
    },
    onError: (e) => avisar(e.message, 'error'),
  })
  const estados = [['CONSOLIDACION', 'En consolidación'], ['RUTA_ACREDITACION', 'En ruta de acreditación'], ['ACREDITADO', 'Acreditado en alta calidad'], ['REACREDITACION', 'En reacreditación']]
  return (
    <Modal abierto cerrar={cerrar} titulo={`Editar ${p.nombre}`} pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cancelar</button>
      <button className="btn-primario" disabled={m.isPending} onClick={() => m.mutate()}>Guardar</button>
    </>}>
      <div className="space-y-4">
        <Campo etiqueta="Momento institucional">
          <select className="campo" value={d.estado} onChange={(e) => setD({ ...d, estado: e.target.value })}>
            {estados.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Detalle" ayuda="Ej. resolución de acreditación o tipo de ruta">
          <input className="campo" value={d.detalle_estado} onChange={(e) => setD({ ...d, detalle_estado: e.target.value })} />
        </Campo>
        <Campo etiqueta="Fecha de visita de pares (CNA)" ayuda="La cercanía de la visita aumenta el índice de riesgo">
          <input type="date" className="campo" value={d.fecha_visita_pares} onChange={(e) => setD({ ...d, fecha_visita_pares: e.target.value })} />
        </Campo>
        <Campo etiqueta="Director de programa">
          <select className="campo" value={d.director} onChange={(e) => setD({ ...d, director: e.target.value })}>
            <option value="">Sin asignar</option>
            {usuarios?.filter((u) => u.rol === 'DIRECTOR').map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </Campo>
      </div>
    </Modal>
  )
}

export function ProgramaDetalle() {
  const { id } = useParams()
  const { esGlobal } = useSesion()
  const [editar, setEditar] = useState(false)
  const q = useQuery({ queryKey: ['programas', id], queryFn: () => api.get<Programa>(`programas/${id}/`) })
  const inds = useQuery({ queryKey: ['indicadores', { programa: id }], queryFn: () => api.get<Indicador[]>('indicadores/', { programa: id }) })
  if (q.isLoading) return <Cargando />
  if (q.error) return <MensajeError error={q.error} />
  const p = q.data!
  return (
    <>
      <Link to="/programas" className="mb-4 inline-flex items-center gap-1 text-sm text-marca-600 hover:underline">
        <ArrowLeft className="size-4" /> Volver a programas
      </Link>
      <div className="tarjeta mb-6 flex flex-col gap-5 p-6 md:flex-row md:items-center">
        <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-2xl" style={{ background: p.nivel ? NIVEL[p.nivel].fondo : '#f1f5f9' }}>
          <span className="text-3xl font-bold" style={{ color: p.nivel ? NIVEL[p.nivel].color : '#64748b' }}>{p.riesgo !== null && p.riesgo !== undefined ? Math.round(p.riesgo) : '—'}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-marca-900">{p.nombre}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Insignia clase={ESTADO_PROGRAMA[p.estado]}>{p.estado_display}</Insignia>
            <NivelRiesgo nivel={p.nivel} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{p.detalle_estado}</p>
          <p className="text-sm text-slate-600"><Visita p={p} /> · Director: {p.director_nombre ?? 'sin asignar'}</p>
        </div>
        {esGlobal && <button className="btn-secundario self-start" onClick={() => setEditar(true)}><Pencil className="size-4" /> Editar</button>}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="tarjeta p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-marca-900">Semáforo por factor de calidad</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.semaforo_factores?.map((s) => (
              <Link key={s.factor_id} to={`/indicadores?programa=${p.id}&factor=${s.factor_id}`}
                className="rounded-xl p-3 text-center ring-1 ring-inset ring-slate-100 transition hover:ring-marca-200"
                style={{ background: s.nivel ? NIVEL[s.nivel].fondo : '#f8fafc' }}>
                <div className="text-xs font-medium text-slate-600">{s.factor}</div>
                <div className="mt-1 text-2xl font-bold" style={{ color: s.nivel ? NIVEL[s.nivel].color : '#94a3b8' }}>
                  {s.riesgo === null ? '—' : Math.round(s.riesgo)}
                </div>
                <div className="text-[11px] text-slate-500">{s.indicadores} indicador{s.indicadores === 1 ? '' : 'es'}</div>
              </Link>
            ))}
          </div>
        </section>
        <section className="tarjeta p-5">
          <h2 className="mb-3 font-semibold text-marca-900">Alertas activas <span className="text-slate-400">{p.alertas?.length ?? 0}</span></h2>
          {p.alertas?.length ? (
            <ul className="space-y-2">
              {p.alertas.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-sm">
                  <Insignia clase={SEVERIDAD[a.severidad].clase}>{SEVERIDAD[a.severidad].texto}</Insignia>
                  <span className="text-slate-700">{a.titulo}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">Sin alertas activas.</p>}
          <Link to={`/alertas?programa=${p.id}`} className="mt-3 inline-block text-sm font-medium text-marca-600 hover:underline">Ir al centro de alertas</Link>
        </section>
      </div>

      <section className="tarjeta overflow-x-auto">
        <h2 className="p-5 pb-3 font-semibold text-marca-900">Indicadores del programa</h2>
        {inds.isLoading ? <Cargando /> : !inds.data?.length ? <Vacio titulo="Sin indicadores" /> : (
          <table className="tabla">
            <thead><tr><th>Código</th><th>Indicador</th><th>Factor</th><th>Meta</th><th>Último valor</th><th>Tend.</th><th>Estado</th><th>Riesgo</th></tr></thead>
            <tbody>
              {inds.data.map((i) => (
                <tr key={i.id}>
                  <td className="font-mono text-xs"><Link className="text-marca-600 hover:underline" to={`/indicadores/${i.id}`}>{i.codigo}</Link></td>
                  <td><Link className="hover:underline" to={`/indicadores/${i.id}`}>{i.nombre}</Link></td>
                  <td className="text-slate-500">{i.factor_nombre}</td>
                  <td className="whitespace-nowrap">{meta(i)}</td>
                  <td className="whitespace-nowrap">{valor(i.ultimo_valor, i.unidad)}</td>
                  <td className={TENDENCIA[i.tendencia].clase} title={TENDENCIA[i.tendencia].texto}>{TENDENCIA[i.tendencia].simbolo}</td>
                  <td><Insignia clase={ESTADO_INDICADOR[i.estado].clase}>{ESTADO_INDICADOR[i.estado].texto}</Insignia></td>
                  <td><NivelRiesgo nivel={i.riesgo?.nivel} puntaje={i.riesgo?.puntaje} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {editar && <EditarPrograma p={p} cerrar={() => setEditar(false)} />}
    </>
  )
}
