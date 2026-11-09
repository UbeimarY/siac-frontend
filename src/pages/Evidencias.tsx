import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check, Download, FilePlus2, Loader2, Paperclip, Send, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, descargar, solicitud } from '../api/cliente'
import { useEstadoIA, useIndicadoresOpciones, usePeriodos, useProgramas, useResponsables } from '../api/consultas'
import type { Evidencia, RevisionIA } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Campo, Cargando, Encabezado, Filtros, Insignia, MensajeError, Modal, Selector, TablaContenedor, Vacio } from '../components/ui'
import { ESTADO_EVIDENCIA, fecha } from '../lib/formato'

const EXT = '.pdf,.xlsx,.xls,.docx,.doc,.zip,.csv,.png,.jpg,.jpeg'

function SelectorIndicador({ programa, setPrograma, indicador, setIndicador }: {
  programa: string; setPrograma: (v: string) => void; indicador: string; setIndicador: (v: string) => void
}) {
  const { data: progs } = useProgramas()
  const { data: inds } = useIndicadoresOpciones(programa || undefined)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo etiqueta="Programa">
        <select className="campo" value={programa} onChange={(e) => { setPrograma(e.target.value); setIndicador('') }}>
          <option value="">Seleccione…</option>
          {progs?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Indicador *">
        <select className="campo" value={indicador} onChange={(e) => setIndicador(e.target.value)} disabled={!programa}>
          <option value="">Seleccione…</option>
          {inds?.map((i) => <option key={i.id} value={i.id}>{i.codigo} · {i.nombre}</option>)}
        </select>
      </Campo>
    </div>
  )
}

function CargarEvidencia({ cerrar, existente }: { cerrar: () => void; existente?: Evidencia }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const { data: periodos } = usePeriodos()
  const [programa, setPrograma] = useState(String(existente?.programa_id ?? ''))
  const [indicador, setIndicador] = useState(String(existente?.indicador ?? ''))
  const [d, setD] = useState({
    nombre: existente?.nombre ?? '', descripcion: existente?.descripcion ?? '', tipo: 'ARCHIVO', enlace: '',
    periodo: String(existente?.periodo ?? periodos?.find((p) => p.activo)?.id ?? ''), vigencia_desde: '', vigencia_hasta: '',
  })
  const [archivo, setArchivo] = useState<File | null>(null)
  const m = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      if (!existente) {
        fd.append('indicador', indicador)
        fd.append('nombre', d.nombre)
        fd.append('descripcion', d.descripcion)
      }
      fd.append('tipo', d.tipo)
      if (d.periodo) fd.append('periodo', d.periodo)
      if (d.vigencia_desde) fd.append('vigencia_desde', d.vigencia_desde)
      if (d.vigencia_hasta) fd.append('vigencia_hasta', d.vigencia_hasta)
      if (d.tipo === 'ARCHIVO' && archivo) fd.append('archivo', archivo)
      if (d.tipo === 'ENLACE') fd.append('enlace', d.enlace)
      return solicitud(existente ? `evidencias/${existente.id}/cargar/` : 'evidencias/', { method: 'POST', cuerpo: fd })
    },
    onSuccess: () => {
      void qc.invalidateQueries()
      avisar('Evidencia cargada. Queda pendiente de revisión por la coordinación de calidad.')
      cerrar()
    },
    onError: (e) => avisar(e.message, 'error'),
  })
  const valido = (existente || (indicador && d.nombre)) && (d.tipo === 'ARCHIVO' ? !!archivo : !!d.enlace)
  return (
    <Modal abierto cerrar={cerrar} titulo={existente ? `Cargar ${existente.codigo}` : 'Cargar evidencia'} ancho="max-w-2xl" pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cancelar</button>
      <button className="btn-primario" disabled={!valido || m.isPending} onClick={() => m.mutate()}>{m.isPending && <Loader2 className="size-4 animate-spin" />} Guardar evidencia</button></>}>
      <div className="space-y-4">
        {existente ? <p className="text-sm text-slate-600"><strong>{existente.nombre}</strong> · {existente.indicador_codigo} {existente.indicador_nombre}</p> : <>
          <SelectorIndicador programa={programa} setPrograma={setPrograma} indicador={indicador} setIndicador={setIndicador} />
          <Campo etiqueta="Nombre de la evidencia *"><input className="campo" placeholder="Ej. Informe de deserción 2026-1" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Descripción"><textarea rows={2} className="campo" value={d.descripcion} onChange={(e) => setD({ ...d, descripcion: e.target.value })} /></Campo>
        </>}
        <div className="flex gap-2" role="radiogroup" aria-label="Tipo de evidencia">
          {[['ARCHIVO', 'Archivo'], ['ENLACE', 'Enlace']].map(([v, t]) => (
            <button key={v} type="button" role="radio" aria-checked={d.tipo === v} onClick={() => setD({ ...d, tipo: v })}
              className={clsx('btn flex-1 border', d.tipo === v ? 'border-marca-500 bg-marca-50 text-marca-700' : 'border-slate-300 bg-white text-slate-600')}>{t}</button>
          ))}
        </div>
        {d.tipo === 'ARCHIVO' ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-marca-500">
            <Upload className="size-6 text-marca-600" />
            <span className="text-sm text-slate-600">{archivo ? archivo.name : 'Haga clic para seleccionar el archivo'}</span>
            <span className="text-xs text-slate-400">PDF, XLSX, DOCX, ZIP, CSV o imagen, hasta 50 MB</span>
            <input type="file" accept={EXT} className="sr-only" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <Campo etiqueta="Enlace *" ayuda="Repositorio institucional, carpeta compartida, etc."><input type="url" className="campo" placeholder="https://…" value={d.enlace} onChange={(e) => setD({ ...d, enlace: e.target.value })} /></Campo>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo etiqueta="Periodo">
            <select className="campo" value={d.periodo} onChange={(e) => setD({ ...d, periodo: e.target.value })}>
              <option value="">—</option>
              {periodos?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Vigente desde"><input type="date" className="campo" value={d.vigencia_desde} onChange={(e) => setD({ ...d, vigencia_desde: e.target.value })} /></Campo>
          <Campo etiqueta="Vigente hasta"><input type="date" className="campo" value={d.vigencia_hasta} onChange={(e) => setD({ ...d, vigencia_hasta: e.target.value })} /></Campo>
        </div>
      </div>
    </Modal>
  )
}

function SolicitarEvidencia({ cerrar }: { cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const { data: resp } = useResponsables()
  const [programa, setPrograma] = useState('')
  const [indicador, setIndicador] = useState('')
  const [d, setD] = useState({ nombre: '', descripcion: '', fecha_limite: '', responsable: '' })
  const m = useMutation({
    mutationFn: () => api.post('evidencias/solicitar/', { ...d, indicador, responsable: d.responsable || null }),
    onSuccess: () => { void qc.invalidateQueries(); avisar('Solicitud creada. Si vence sin cargarse, se genera una alerta.'); cerrar() },
    onError: (e) => avisar(e.message, 'error'),
  })
  return (
    <Modal abierto cerrar={cerrar} titulo="Solicitar evidencia con fecha límite" ancho="max-w-2xl" pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cancelar</button>
      <button className="btn-primario" disabled={!indicador || !d.nombre || !d.fecha_limite || m.isPending} onClick={() => m.mutate()}>Crear solicitud</button></>}>
      <div className="space-y-4">
        <SelectorIndicador programa={programa} setPrograma={setPrograma} indicador={indicador} setIndicador={setIndicador} />
        <Campo etiqueta="Evidencia solicitada *"><input className="campo" placeholder="Ej. Informe de investigación 2026-2" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} /></Campo>
        <Campo etiqueta="Indicaciones"><textarea rows={2} className="campo" value={d.descripcion} onChange={(e) => setD({ ...d, descripcion: e.target.value })} /></Campo>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha límite *"><input type="date" className="campo" value={d.fecha_limite} onChange={(e) => setD({ ...d, fecha_limite: e.target.value })} /></Campo>
          <Campo etiqueta="Responsable" ayuda="Por defecto, el responsable del indicador">
            <select className="campo" value={d.responsable} onChange={(e) => setD({ ...d, responsable: e.target.value })}>
              <option value="">Responsable del indicador</option>
              {resp?.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </Campo>
        </div>
      </div>
    </Modal>
  )
}

function Revision({ ev, cerrar }: { ev: Evidencia; cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const [obs, setObs] = useState('')
  const m = useMutation({
    mutationFn: (accion: 'aprobar' | 'rechazar') => api.post(`evidencias/${ev.id}/${accion}/`, { observaciones: obs }),
    onSuccess: (_, accion) => { void qc.invalidateQueries(); avisar(accion === 'aprobar' ? 'Evidencia aprobada.' : 'Evidencia rechazada.'); cerrar() },
    onError: (e) => avisar(e.message, 'error'),
  })
  return (
    <Modal abierto cerrar={cerrar} titulo={`Validar ${ev.codigo}`} pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cancelar</button>
      <button className="btn-peligro" disabled={!obs.trim() || m.isPending} onClick={() => m.mutate('rechazar')} title={!obs.trim() ? 'Escriba el motivo del rechazo' : ''}><X className="size-4" /> Rechazar</button>
      <button className="btn-primario" disabled={m.isPending} onClick={() => m.mutate('aprobar')}><Check className="size-4" /> Aprobar</button></>}>
      <p className="text-sm"><strong>{ev.nombre}</strong></p>
      <p className="mb-3 text-sm text-slate-600">{ev.indicador_codigo} {ev.indicador_nombre} · {ev.programa_nombre}</p>
      {ev.revision_ia && <ResultadoIA r={ev.revision_ia} />}
      <Campo etiqueta="Observaciones" ayuda="Obligatorias para rechazar">
        <textarea rows={3} className="campo" value={obs} onChange={(e) => setObs(e.target.value)} />
      </Campo>
    </Modal>
  )
}

function ResultadoIA({ r }: { r: RevisionIA }) {
  const color = r.corresponde === 'SI' ? 'border-green-200 bg-green-50' : r.corresponde === 'PARCIAL' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
  return (
    <div className={clsx('mb-4 rounded-xl border p-4 text-sm', color)}>
      <div className="mb-1 flex items-center gap-2 font-semibold text-violet-800"><Sparkles className="size-4" /> Pre-revisión con IA</div>
      <p><strong>¿Corresponde al indicador?</strong> {r.corresponde === 'SI' ? 'Sí' : r.corresponde === 'PARCIAL' ? 'Parcialmente' : 'No'} (confianza {r.confianza.toLowerCase()})</p>
      {(r.periodo_detectado || r.valor_detectado) && <p>Periodo detectado: {r.periodo_detectado ?? '—'} · Valor detectado: {r.valor_detectado ?? '—'}</p>}
      <p className="mt-1">{r.resumen}</p>
      {r.observaciones?.length > 0 && <ul className="mt-2 list-disc pl-5">{r.observaciones.map((o) => <li key={o}>{o}</li>)}</ul>}
      {r.faltantes?.length > 0 && <><p className="mt-2 font-medium">Faltantes:</p><ul className="list-disc pl-5">{r.faltantes.map((o) => <li key={o}>{o}</li>)}</ul></>}
      <p className="mt-2 text-xs text-slate-500">Sugerencia automática: la decisión final es de la coordinación de calidad.</p>
    </div>
  )
}

export default function Evidencias() {
  const { usuario, esGlobal, soloLectura, tieneRol } = useSesion()
  const qc = useQueryClient()
  const avisar = useAvisos()
  const ia = useEstadoIA()
  const [sp, setSp] = useSearchParams()
  const f = { estado: sp.get('estado') ?? '', 'indicador__programa': sp.get('programa') ?? '', indicador: sp.get('indicador') ?? '' }
  const setF = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }
  const { data: progs } = useProgramas()
  const [cargar, setCargar] = useState<Evidencia | true | null>(null)
  const [solicitar, setSolicitar] = useState(false)
  const [revisar, setRevisar] = useState<Evidencia | null>(null)
  const [verIA, setVerIA] = useState<Evidencia | null>(null)
  const q = useQuery({ queryKey: ['evidencias', f], queryFn: () => api.get<Evidencia[]>('evidencias/', f) })
  const revisarIA = useMutation({
    mutationFn: (ev: Evidencia) => api.post<RevisionIA>(`ia/revisar-evidencia/${ev.id}/`),
    onSuccess: (r, ev) => { void qc.invalidateQueries({ queryKey: ['evidencias'] }); setVerIA({ ...ev, revision_ia: r }) },
    onError: (e) => avisar(e.message, 'error'),
  })
  const eliminar = useMutation({
    mutationFn: (ev: Evidencia) => api.delete(`evidencias/${ev.id}/`),
    onSuccess: () => { void qc.invalidateQueries(); avisar('Evidencia eliminada.') },
    onError: (e) => avisar(e.message, 'error'),
  })
  const estados = ['', 'POR_CARGAR', 'PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA']

  return (
    <>
      <Encabezado titulo="Evidencias" subtitulo={`${q.data?.length ?? 0} evidencias`} acciones={!soloLectura && <>
        {tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR') && <button className="btn-secundario" onClick={() => setSolicitar(true)}><Send className="size-4" /> Solicitar evidencia</button>}
        <button className="btn-primario" onClick={() => setCargar(true)}><Paperclip className="size-4" /> Cargar evidencia</button>
      </>} />
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por estado">
        {estados.map((e) => (
          <button key={e} role="tab" aria-selected={f.estado === e} onClick={() => setF('estado', e)}
            className={clsx('rounded-full px-3 py-1 text-sm font-medium', f.estado === e ? 'bg-marca-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}>
            {e ? ESTADO_EVIDENCIA[e].texto : 'Todas'}
          </button>
        ))}
      </div>
      <Filtros>
        <Selector etiqueta="Programa" valor={f['indicador__programa']} cambiar={(v) => setF('programa', v)} opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
        {f.indicador && <button className="btn-secundario btn-chico" onClick={() => setF('indicador', '')}>Quitar filtro de indicador <X className="size-3" /></button>}
      </Filtros>
      {q.isLoading && <Cargando />}
      {q.error && <MensajeError error={q.error} />}
      {q.data && (
        <TablaContenedor>
          {q.data.length === 0 ? <Vacio titulo="No hay evidencias con estos filtros" icono={<FilePlus2 className="size-10" />} /> : (
            <table className="tabla">
              <thead><tr><th>Código</th><th>Evidencia</th><th>Indicador</th><th>Programa</th><th>Tipo</th><th>Vigencia</th><th>Responsable</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {q.data.map((e) => {
                  const propia = e.responsable === usuario?.id
                  const puedeCargar = !soloLectura && (e.estado === 'POR_CARGAR' || e.estado === 'RECHAZADA') && (propia || tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR'))
                  return (
                    <tr key={e.id}>
                      <td className="font-mono text-xs">{e.codigo}</td>
                      <td className="min-w-48">
                        <div className="font-medium">{e.nombre}</div>
                        {e.estado === 'POR_CARGAR' && e.fecha_limite && <div className={clsx('text-xs', e.estado_visible === 'VENCIDA' ? 'font-medium text-red-600' : 'text-slate-500')}>Fecha límite: {fecha(e.fecha_limite)}</div>}
                        {e.estado === 'RECHAZADA' && e.observaciones_revision && <div className="text-xs text-red-600">Motivo: {e.observaciones_revision}</div>}
                        {e.revision_ia && <button className="text-xs text-violet-700 hover:underline" onClick={() => setVerIA(e)}>Ver pre-revisión IA ({e.revision_ia.corresponde})</button>}
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs" title={e.indicador_nombre}>{e.indicador_codigo}</td>
                      <td className="whitespace-nowrap">{e.programa_nombre}</td>
                      <td>{e.tipo_documento || '—'}</td>
                      <td className="whitespace-nowrap text-xs text-slate-600">{e.vigencia_desde || e.vigencia_hasta ? `${fecha(e.vigencia_desde)} – ${fecha(e.vigencia_hasta)}` : '—'}</td>
                      <td className="whitespace-nowrap">{e.responsable_nombre ?? e.cargado_por_nombre ?? '—'}</td>
                      <td><Insignia clase={ESTADO_EVIDENCIA[e.estado_visible].clase}>{ESTADO_EVIDENCIA[e.estado_visible].texto}</Insignia></td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(e.tiene_archivo || e.enlace) && <button className="btn-secundario btn-chico" onClick={() => void descargar(`evidencias/${e.id}/descargar/`).catch((er) => avisar(er.message, 'error'))} title="Descargar o abrir"><Download className="size-3.5" /></button>}
                          {puedeCargar && <button className="btn-secundario btn-chico" onClick={() => setCargar(e)}><Upload className="size-3.5" /> Cargar</button>}
                          {esGlobal && e.estado === 'PENDIENTE' && <button className="btn-primario btn-chico" onClick={() => setRevisar(e)}>Validar</button>}
                          {esGlobal && e.estado === 'APROBADA' && <button className="btn-secundario btn-chico" onClick={() => setRevisar(e)}>Revalidar</button>}
                          {ia.data?.disponible && !soloLectura && e.estado !== 'POR_CARGAR' && (
                            <button className="btn-secundario btn-chico text-violet-700" disabled={revisarIA.isPending} onClick={() => revisarIA.mutate(e)} title="Pre-revisar con IA">
                              {revisarIA.isPending && revisarIA.variables?.id === e.id ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                            </button>
                          )}
                          {(esGlobal || (e.estado !== 'APROBADA' && propia)) && e.estado !== 'POR_CARGAR' && (
                            <button className="btn-secundario btn-chico text-red-600" title="Eliminar" onClick={() => window.confirm(`¿Eliminar la evidencia ${e.codigo}? Esta acción no se puede deshacer.`) && eliminar.mutate(e)}><Trash2 className="size-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </TablaContenedor>
      )}
      {cargar && <CargarEvidencia cerrar={() => setCargar(null)} existente={cargar === true ? undefined : cargar} />}
      {solicitar && <SolicitarEvidencia cerrar={() => setSolicitar(false)} />}
      {revisar && <Revision ev={revisar} cerrar={() => setRevisar(null)} />}
      {verIA?.revision_ia && (
        <Modal abierto cerrar={() => setVerIA(null)} titulo={`Pre-revisión IA · ${verIA.codigo}`} pie={<button className="btn-secundario" onClick={() => setVerIA(null)}>Cerrar</button>}>
          <ResultadoIA r={verIA.revision_ia} />
        </Modal>
      )}
    </>
  )
}
