import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, History, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/cliente'
import { usePeriodos } from '../api/consultas'
import type { Evidencia, Indicador, RegistroIndicador } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Barra, Campo, Cargando, Insignia, MensajeError, Modal, NivelRiesgo } from '../components/ui'
import { COMPONENTES, ESTADO_EVIDENCIA, ESTADO_INDICADOR, fecha, fechaHora, meta, TENDENCIA, valor } from '../lib/formato'
import { FormularioIndicador } from './Indicadores'

function RegistrarValor({ ind, cerrar }: { ind: Indicador; cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const { data: periodos } = usePeriodos()
  const vigente = periodos?.find((p) => p.activo)
  const [d, setD] = useState({ periodo: '', valor: '', observaciones: '' })
  const periodo = d.periodo || String(vigente?.id ?? '')
  const m = useMutation({
    mutationFn: () => api.post(`indicadores/${ind.id}/registros/`, { ...d, periodo }),
    onSuccess: () => {
      void qc.invalidateQueries()
      avisar('Valor registrado. Se recalcularon el riesgo y las alertas.')
      cerrar()
    },
    onError: (e) => avisar(e.message, 'error'),
  })
  return (
    <Modal abierto cerrar={cerrar} titulo={`Registrar valor · ${ind.codigo}`} pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cancelar</button>
      <button className="btn-primario" disabled={!periodo || d.valor === '' || m.isPending} onClick={() => m.mutate()}>Registrar</button></>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{ind.nombre} · Meta {meta(ind)}</p>
        <Campo etiqueta="Periodo" ayuda="Si ya existe un valor para el periodo, se corrige (queda en la bitácora)">
          <select className="campo" value={periodo} onChange={(e) => setD({ ...d, periodo: e.target.value })}>
            {periodos?.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (vigente)' : ''}</option>)}
          </select>
        </Campo>
        <Campo etiqueta={`Valor medido (${ind.unidad === 'PORCENTAJE' ? '%' : ind.unidad === 'ESCALA' ? 'escala 1–5' : 'número'})`}>
          <input type="number" step="any" className="campo" value={d.valor} onChange={(e) => setD({ ...d, valor: e.target.value })} />
        </Campo>
        <Campo etiqueta="Observaciones"><textarea rows={2} className="campo" value={d.observaciones} onChange={(e) => setD({ ...d, observaciones: e.target.value })} /></Campo>
      </div>
    </Modal>
  )
}

export default function IndicadorDetalle() {
  const { id } = useParams()
  const { usuario, tieneRol } = useSesion()
  const [registrar, setRegistrar] = useState(false)
  const [editar, setEditar] = useState(false)
  const q = useQuery({ queryKey: ['indicadores', id], queryFn: () => api.get<Indicador>(`indicadores/${id}/`) })
  const regs = useQuery({ queryKey: ['indicadores', id, 'registros'], queryFn: () => api.get<RegistroIndicador[]>(`indicadores/${id}/registros/`) })
  const hist = useQuery({ queryKey: ['indicadores', id, 'historial'], queryFn: () => api.get<{ fecha: string; usuario: string; accion: string; modulo: string }[]>(`indicadores/${id}/historial/`) })
  const evs = useQuery({ queryKey: ['evidencias', { indicador: id }], queryFn: () => api.get<Evidencia[]>('evidencias/', { indicador: id }) })
  if (q.isLoading) return <Cargando />
  if (q.error) return <MensajeError error={q.error} />
  const i = q.data!
  const puedeRegistrar = tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR') || i.responsable === usuario?.id
  const puedeEditar = tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR')
  const datos = (regs.data ?? []).map((r) => ({ periodo: r.periodo_nombre, valor: Number(r.valor) }))

  return (
    <>
      <Link to="/indicadores" className="mb-4 inline-flex items-center gap-1 text-sm text-marca-600 hover:underline"><ArrowLeft className="size-4" /> Volver a indicadores</Link>
      <div className="tarjeta mb-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-sm text-slate-500">{i.codigo} · {i.programa_nombre} · {i.factor_nombre}</p>
            <h1 className="mt-1 text-2xl font-bold text-marca-900">{i.nombre}</h1>
            {i.descripcion && <p className="mt-2 max-w-3xl text-sm text-slate-600">{i.descripcion}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Insignia clase={ESTADO_INDICADOR[i.estado].clase}>{ESTADO_INDICADOR[i.estado].texto}</Insignia>
              <NivelRiesgo nivel={i.riesgo?.nivel} puntaje={i.riesgo?.puntaje} />
              <span className={`text-sm ${TENDENCIA[i.tendencia].clase}`}>{TENDENCIA[i.tendencia].simbolo} {TENDENCIA[i.tendencia].texto}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {puedeEditar && <button className="btn-secundario" onClick={() => setEditar(true)}><Pencil className="size-4" /> Editar</button>}
            {puedeRegistrar && <button className="btn-primario" onClick={() => setRegistrar(true)}><Plus className="size-4" /> Registrar valor</button>}
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div><dt className="text-xs text-slate-500">Meta</dt><dd className="font-semibold">{meta(i)}</dd></div>
          <div><dt className="text-xs text-slate-500">Último valor</dt><dd className="font-semibold">{valor(i.ultimo_valor, i.unidad)}</dd></div>
          <div><dt className="text-xs text-slate-500">Cumplimiento</dt><dd className="font-semibold">{i.cumplimiento === null ? '—' : `${Math.round(i.cumplimiento)}%`}</dd></div>
          <div><dt className="text-xs text-slate-500">Periodicidad</dt><dd>{i.periodicidad_display}</dd></div>
          <div><dt className="text-xs text-slate-500">Próxima actualización</dt><dd>{fecha(i.proxima_actualizacion)}</dd></div>
          <div><dt className="text-xs text-slate-500">Responsable</dt><dd>{i.responsable_nombre ?? '—'}</dd></div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-6"><dt className="text-xs text-slate-500">Fuente de verificación</dt><dd>{i.fuente_verificacion || '—'}</dd></div>
        </dl>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="tarjeta p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-marca-900">Histórico de registros</h2>
          {datos.length === 0 ? <p className="text-sm text-slate-500">Aún no hay registros.</p> : (
            <div className="h-64" role="img" aria-label={`Gráfico del histórico de ${i.nombre}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datos} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v) => valor(v as number, i.unidad)} />
                  <ReferenceLine y={Number(i.meta)} stroke="#b45309" strokeDasharray="6 4" label={{ value: `Meta ${meta(i)}`, fontSize: 11, fill: '#b45309', position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="valor" stroke="#1f3a68" strokeWidth={2.5} dot={{ r: 4 }} name="Valor" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {regs.data && regs.data.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="tabla">
                <thead><tr><th>Periodo</th><th>Fecha de corte</th><th>Valor</th><th>Cumplimiento</th><th>Registrado por</th><th>Observaciones</th></tr></thead>
                <tbody>{[...regs.data].reverse().map((r) => (
                  <tr key={r.id}><td>{r.periodo_nombre}</td><td>{fecha(r.fecha_corte)}</td><td>{valor(r.valor, i.unidad)}</td>
                    <td>{r.cumplimiento === null ? '—' : `${Math.round(r.cumplimiento)}%`}</td><td>{r.registrado_por_nombre ?? '—'}</td>
                    <td className="text-slate-500">{r.observaciones}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
        <section className="tarjeta p-5">
          <h2 className="mb-1 font-semibold text-marca-900">Desglose del índice de riesgo</h2>
          <p className="mb-4 text-xs text-slate-500">Cada componente aporta factor × peso al índice (0–100).</p>
          {i.riesgo ? (
            <ul className="space-y-3">
              {Object.entries(i.riesgo.componentes).map(([k, c]) => (
                <li key={k}>
                  <div className="mb-1 flex justify-between text-sm"><span>{COMPONENTES[k] ?? k}</span><span className="font-semibold">{c.aporte} <span className="font-normal text-slate-400">/ {c.peso}</span></span></div>
                  <Barra valor={c.aporte} max={c.peso || 1} color="#2b4c7e" />
                </li>
              ))}
              <li className="flex justify-between border-t border-slate-100 pt-3 font-semibold"><span>Índice</span><span>{i.riesgo.puntaje}</span></li>
            </ul>
          ) : <p className="text-sm text-slate-500">Sin cálculo aún.</p>}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="tarjeta">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-semibold text-marca-900">Evidencias</h2>
            <Link to={`/evidencias?indicador=${i.id}`} className="text-sm text-marca-600 hover:underline">Gestionar</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {evs.data?.length ? evs.data.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div><div className="font-medium">{e.nombre}</div><div className="text-xs text-slate-500">{e.codigo} · {e.tipo_documento || '—'} · vigencia {fecha(e.vigencia_desde)} – {fecha(e.vigencia_hasta)}</div></div>
                <Insignia clase={ESTADO_EVIDENCIA[e.estado_visible].clase}>{ESTADO_EVIDENCIA[e.estado_visible].texto}</Insignia>
              </li>
            )) : <li className="px-5 pb-5 text-sm text-slate-500">Sin evidencias.</li>}
          </ul>
        </section>
        <section className="tarjeta">
          <h2 className="flex items-center gap-2 p-5 pb-3 font-semibold text-marca-900"><History className="size-4" /> Historial de cambios</h2>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {hist.data?.length ? hist.data.map((h, k) => (
              <li key={k} className="px-5 py-2.5 text-sm"><div>{h.accion}</div><div className="text-xs text-slate-500">{h.usuario} · {fechaHora(h.fecha)}</div></li>
            )) : <li className="px-5 pb-5 text-sm text-slate-500">Sin cambios registrados.</li>}
          </ul>
        </section>
      </div>
      {registrar && <RegistrarValor ind={i} cerrar={() => setRegistrar(false)} />}
      {editar && <FormularioIndicador inicial={i} cerrar={() => setEditar(false)} />}
    </>
  )
}
