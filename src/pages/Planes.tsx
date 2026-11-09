import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/cliente'
import { useIndicadoresOpciones, useProgramas, useResponsables } from '../api/consultas'
import type { Plan } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Barra, Campo, Cargando, Encabezado, Filtros, Insignia, MensajeError, Modal, Selector, TablaContenedor, Vacio } from '../components/ui'
import { ESTADO_PLAN, fecha, hoyISO } from '../lib/formato'

export type BorradorPlan = Partial<Pick<Plan, 'programa' | 'indicador' | 'alerta_origen' | 'accion' | 'descripcion' | 'meta_esperada' | 'fecha_inicio' | 'fecha_limite' | 'generado_con_ia'>>

export function FormularioPlan({ inicial, borrador, cerrar }: { inicial?: Plan; borrador?: BorradorPlan; cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const { usuario, tieneRol } = useSesion()
  const base = inicial ?? borrador ?? {}
  const soloAvance = !!inicial && !tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR')
  const { data: progs } = useProgramas()
  const { data: resp } = useResponsables()
  const [d, setD] = useState({
    programa: String(base.programa ?? (usuario?.es_global ? '' : (usuario?.programas[0] ?? ''))),
    indicador: String(base.indicador ?? ''), accion: base.accion ?? '', descripcion: base.descripcion ?? '',
    meta_esperada: base.meta_esperada ?? '', responsable: String(inicial?.responsable ?? ''),
    fecha_inicio: base.fecha_inicio ?? hoyISO(), fecha_limite: base.fecha_limite ?? '',
    avance: inicial?.avance ?? 0, estado: inicial?.estado ?? 'PROGRAMADO',
  })
  const { data: inds } = useIndicadoresOpciones(d.programa || undefined)
  const m = useMutation({
    mutationFn: () => {
      if (soloAvance) return api.patch(`planes/${inicial!.id}/`, { avance: d.avance, estado: d.estado, descripcion: d.descripcion })
      const cuerpo = {
        ...d, indicador: d.indicador || null, responsable: d.responsable || null,
        ...(inicial ? {} : { alerta_origen: borrador?.alerta_origen ?? null, generado_con_ia: !!borrador?.generado_con_ia }),
      }
      return inicial ? api.patch(`planes/${inicial.id}/`, cuerpo) : api.post('planes/', cuerpo)
    },
    onSuccess: () => { void qc.invalidateQueries(); avisar(inicial ? 'Plan actualizado.' : 'Plan de mejoramiento registrado.'); cerrar() },
    onError: (e) => avisar(e.message, 'error'),
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value })
  const valido = soloAvance || (d.programa && d.accion && d.fecha_limite)
  return (
    <Modal abierto cerrar={cerrar} titulo={inicial ? `Plan ${inicial.codigo}` : 'Nueva acción de mejoramiento'} ancho="max-w-2xl" pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cancelar</button>
      <button className="btn-primario" disabled={!valido || m.isPending} onClick={() => m.mutate()}>Guardar</button></>}>
      {borrador?.generado_con_ia && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-violet-50 p-3 text-sm text-violet-800"><Sparkles className="mt-0.5 size-4 shrink-0" /> Propuesta generada con IA. Revísela y ajústela antes de guardar.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Programa *">
          <select className="campo" value={d.programa} onChange={(e) => setD({ ...d, programa: e.target.value, indicador: '' })} disabled={soloAvance || !!inicial || !!borrador?.programa}>
            <option value="">Seleccione…</option>
            {progs?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Indicador asociado">
          <select className="campo" value={d.indicador} onChange={set('indicador')} disabled={soloAvance || !d.programa}>
            <option value="">Ninguno</option>
            {inds?.map((i) => <option key={i.id} value={i.id}>{i.codigo} · {i.nombre}</option>)}
          </select>
        </Campo>
        <div className="sm:col-span-2"><Campo etiqueta="Acción *"><input className="campo" value={d.accion} onChange={set('accion')} disabled={soloAvance} maxLength={300} /></Campo></div>
        <div className="sm:col-span-2"><Campo etiqueta="Descripción"><textarea rows={3} className="campo" value={d.descripcion} onChange={set('descripcion')} /></Campo></div>
        <Campo etiqueta="Meta esperada"><input className="campo" value={d.meta_esperada} onChange={set('meta_esperada')} disabled={soloAvance} /></Campo>
        <Campo etiqueta="Responsable">
          <select className="campo" value={d.responsable} onChange={set('responsable')} disabled={soloAvance}>
            <option value="">Sin asignar</option>
            {resp?.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Inicio"><input type="date" className="campo" value={d.fecha_inicio} onChange={set('fecha_inicio')} disabled={soloAvance} /></Campo>
        <Campo etiqueta="Fecha límite *"><input type="date" className="campo" value={d.fecha_limite} onChange={set('fecha_limite')} disabled={soloAvance} /></Campo>
        {inicial && <>
          <Campo etiqueta={`Avance: ${d.avance}%`}><input type="range" min={0} max={100} step={5} value={d.avance} onChange={(e) => setD({ ...d, avance: Number(e.target.value) })} className="w-full accent-marca-700" /></Campo>
          <Campo etiqueta="Estado">
            <select className="campo" value={d.estado} onChange={set('estado')}>
              {['PROGRAMADO', 'EN_EJECUCION', 'POR_CERRAR', 'CERRADO'].map((s) => <option key={s} value={s}>{ESTADO_PLAN[s].texto}</option>)}
            </select>
          </Campo>
        </>}
      </div>
    </Modal>
  )
}

export default function Planes() {
  const { usuario, soloLectura, tieneRol } = useSesion()
  const [sp, setSp] = useSearchParams()
  const f = { programa: sp.get('programa') ?? '', estado_visible: sp.get('estado') ?? '', responsable: sp.get('responsable') ?? '' }
  const setF = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }
  const { data: progs } = useProgramas()
  const { data: resp } = useResponsables()
  const [form, setForm] = useState<Plan | true | null>(null)
  const q = useQuery({ queryKey: ['planes', f], queryFn: () => api.get<Plan[]>('planes/', f) })
  const lista = (q.data ?? []).filter((p) => f.estado_visible || p.estado !== 'CANCELADO')
  return (
    <>
      <Encabezado titulo="Planes de mejoramiento" subtitulo={`${lista.length} acciones registradas`}
        acciones={tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR') && <button className="btn-primario" onClick={() => setForm(true)}><Plus className="size-4" /> Nueva acción</button>} />
      <Filtros>
        <Selector etiqueta="Programa" valor={f.programa} cambiar={(v) => setF('programa', v)} opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
        <Selector etiqueta="Estado" valor={f.estado_visible} cambiar={(v) => setF('estado', v)} opciones={Object.entries(ESTADO_PLAN).map(([k, v]) => ({ valor: k, texto: v.texto }))} />
        <Selector etiqueta="Responsable" valor={f.responsable} cambiar={(v) => setF('responsable', v)} opciones={(resp ?? []).map((r) => ({ valor: r.id, texto: r.nombre }))} />
      </Filtros>
      {q.isLoading && <Cargando />}
      {q.error && <MensajeError error={q.error} />}
      {q.data && (
        <TablaContenedor>
          {lista.length === 0 ? <Vacio titulo="No hay acciones con estos filtros" /> : (
            <table className="tabla">
              <thead><tr><th>Código</th><th>Acción</th><th>Programa</th><th>Indicador</th><th>Responsable</th><th>Inicio</th><th>Límite</th><th>Avance</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {lista.map((p) => {
                  const puedeEditar = !soloLectura && (tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR') || p.responsable === usuario?.id)
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.codigo}</td>
                      <td className="min-w-56">
                        <div className="font-medium">{p.accion}</div>
                        {p.generado_con_ia && <span className="inline-flex items-center gap-1 text-xs text-violet-700"><Sparkles className="size-3" /> Propuesto con IA</span>}
                      </td>
                      <td className="whitespace-nowrap">{p.programa_nombre}</td>
                      <td className="font-mono text-xs">{p.indicador_codigo ?? '—'}</td>
                      <td className="whitespace-nowrap">{p.responsable_nombre ?? '—'}</td>
                      <td className="whitespace-nowrap">{fecha(p.fecha_inicio)}</td>
                      <td className="whitespace-nowrap">{fecha(p.fecha_limite)}</td>
                      <td className="min-w-32">
                        <div className="flex items-center gap-2"><Barra valor={p.avance} color={p.estado_visible === 'RETRASADO' ? '#b91c1c' : '#2b4c7e'} /><span className="w-9 text-right text-xs">{p.avance}%</span></div>
                        <div className="text-[11px] text-slate-400">esperado {p.avance_esperado}%</div>
                      </td>
                      <td><Insignia clase={ESTADO_PLAN[p.estado_visible]?.clase ?? ''}>{ESTADO_PLAN[p.estado_visible]?.texto ?? p.estado_visible}</Insignia></td>
                      <td>{puedeEditar && <button className="btn-secundario btn-chico" onClick={() => setForm(p)}><Pencil className="size-3.5" /> {tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR') ? 'Editar' : 'Avance'}</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </TablaContenedor>
      )}
      {form && <FormularioPlan inicial={form === true ? undefined : form} cerrar={() => setForm(null)} />}
    </>
  )
}
