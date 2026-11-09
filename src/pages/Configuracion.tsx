import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Eye, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/cliente'
import { useProgramas } from '../api/consultas'
import type { ConfiguracionRiesgo, Nivel } from '../api/tipos'
import { useAvisos } from '../components/avisos'
import { Cargando, Encabezado, Insignia, MensajeError, NivelRiesgo } from '../components/ui'
import { COMPONENTES, fechaHora } from '../lib/formato'

const PESOS = ['peso_tendencia', 'peso_brecha', 'peso_evidencia', 'peso_vencimiento', 'peso_visita'] as const
type Editable = Pick<ConfiguracionRiesgo, (typeof PESOS)[number] | 'umbral_bajo' | 'umbral_medio' | 'dias_aviso_vencimiento' | 'horizonte_visita_dias'>

function Editor({ cfg }: { cfg: ConfiguracionRiesgo }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const inicial = (): Editable => ({
    peso_tendencia: cfg.peso_tendencia, peso_brecha: cfg.peso_brecha, peso_evidencia: cfg.peso_evidencia,
    peso_vencimiento: cfg.peso_vencimiento, peso_visita: cfg.peso_visita, umbral_bajo: cfg.umbral_bajo,
    umbral_medio: cfg.umbral_medio, dias_aviso_vencimiento: cfg.dias_aviso_vencimiento, horizonte_visita_dias: cfg.horizonte_visita_dias,
  })
  const [d, setD] = useState<Editable>(inicial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setD(inicial())
  }, [cfg.id, cfg.actualizado])
  const total = PESOS.reduce((s, k) => s + d[k], 0)
  const umbralesOk = 0 < d.umbral_bajo && d.umbral_bajo < d.umbral_medio && d.umbral_medio < 100
  const valido = total === 100 && umbralesOk
  const guardar = useMutation({
    mutationFn: () => api.patch(`configuracion-riesgo/${cfg.id}/`, d),
    onSuccess: () => { void qc.invalidateQueries(); avisar('Configuración guardada. Se recalcularon los índices y las alertas.') },
    onError: (e) => avisar(e.message, 'error'),
  })
  const eliminar = useMutation({
    mutationFn: () => api.delete(`configuracion-riesgo/${cfg.id}/`),
    onSuccess: () => { void qc.invalidateQueries(); avisar('El programa vuelve a usar la configuración global.') },
    onError: (e) => avisar(e.message, 'error'),
  })
  const preview = useMutation({
    mutationFn: () => api.post<{ programa: string; riesgo: number; nivel: Nivel }[]>('configuracion-riesgo/vista-previa/', d),
    onError: (e) => avisar(e.message, 'error'),
  })
  const num = (k: keyof Editable) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: Number(e.target.value) })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="tarjeta p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-marca-900">Pesos del índice de riesgo</h2>
          <Insignia clase={total === 100 ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200'}>Total: {total}%</Insignia>
        </div>
        <div className="space-y-4">
          {PESOS.map((k) => (
            <div key={k}>
              <div className="mb-1 flex justify-between text-sm"><label htmlFor={`${cfg.id}-${k}`}>{COMPONENTES[k.replace('peso_', '')]}</label><span className="font-semibold">{d[k]}%</span></div>
              <input id={`${cfg.id}-${k}`} type="range" min={0} max={100} step={5} value={d[k]} onChange={num(k)} className="w-full accent-marca-700" />
            </div>
          ))}
        </div>
        {total !== 100 && <p className="mt-3 text-sm text-red-600">Los pesos deben sumar exactamente 100 %.</p>}
      </section>
      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold text-marca-900">Rangos del semáforo y reglas</h2>
        <div className="grid grid-cols-2 gap-4">
          <label><span className="etiqueta">Límite riesgo bajo</span><input type="number" min={1} max={98} className="campo" value={d.umbral_bajo} onChange={num('umbral_bajo')} /></label>
          <label><span className="etiqueta">Límite riesgo medio</span><input type="number" min={2} max={99} className="campo" value={d.umbral_medio} onChange={num('umbral_medio')} /></label>
          <label><span className="etiqueta">Aviso de vencimiento (días)</span><input type="number" min={1} className="campo" value={d.dias_aviso_vencimiento} onChange={num('dias_aviso_vencimiento')} /></label>
          <label><span className="etiqueta">Horizonte visita de pares (días)</span><input type="number" min={30} className="campo" value={d.horizonte_visita_dias} onChange={num('horizonte_visita_dias')} /></label>
        </div>
        {!umbralesOk && <p className="mt-2 text-sm text-red-600">Debe cumplirse 0 &lt; bajo &lt; medio &lt; 100.</p>}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-slate-500">Vista previa del semáforo</p>
          <div className="flex overflow-hidden rounded-lg text-center text-xs font-semibold">
            <div className="bg-green-100 py-2 text-green-800" style={{ width: `${d.umbral_bajo}%` }}>Bajo 0–{d.umbral_bajo}</div>
            <div className="bg-amber-100 py-2 text-amber-800" style={{ width: `${Math.max(0, d.umbral_medio - d.umbral_bajo)}%` }}>Medio {d.umbral_bajo + 1}–{d.umbral_medio}</div>
            <div className="flex-1 bg-red-100 py-2 text-red-800">Alto {d.umbral_medio + 1}–100</div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button className="btn-primario" disabled={!valido || guardar.isPending} onClick={() => guardar.mutate()}><Save className="size-4" /> Guardar configuración</button>
          {!cfg.programa && <button className="btn-secundario" disabled={!valido || preview.isPending} onClick={() => preview.mutate()}><Eye className="size-4" /> Simular</button>}
          <button className="btn-secundario" onClick={() => setD(inicial())}><RotateCcw className="size-4" /> Deshacer</button>
          {cfg.programa && <button className="btn-secundario text-red-600" onClick={() => window.confirm('¿Eliminar la configuración propia? El programa usará la global.') && eliminar.mutate()}><Trash2 className="size-4" /> Usar la global</button>}
        </div>
        <p className="mt-3 text-xs text-slate-400">Última modificación: {fechaHora(cfg.actualizado)}{cfg.actualizado_por_nombre ? ` por ${cfg.actualizado_por_nombre}` : ''}</p>
        {preview.data && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-500">Índice simulado por programa (sin guardar, sin pesos propios)</p>
            <ul className="grid grid-cols-2 gap-2 text-sm">{preview.data.map((p) => <li key={p.programa} className="flex items-center justify-between gap-2">{p.programa}<NivelRiesgo nivel={p.nivel} puntaje={p.riesgo} /></li>)}</ul>
          </div>
        )}
      </section>
    </div>
  )
}

export default function Configuracion() {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const { data: progs } = useProgramas()
  const q = useQuery({ queryKey: ['configuracion-riesgo'], queryFn: () => api.get<ConfiguracionRiesgo[]>('configuracion-riesgo/') })
  const [sel, setSel] = useState<number | null>(null)
  const [nuevo, setNuevo] = useState('')
  const crear = useMutation({
    mutationFn: () => {
      const g = q.data!.find((c) => c.programa === null)!
      const { peso_tendencia, peso_brecha, peso_evidencia, peso_vencimiento, peso_visita, umbral_bajo, umbral_medio, dias_aviso_vencimiento, horizonte_visita_dias } = g
      return api.post<ConfiguracionRiesgo>('configuracion-riesgo/', { programa: Number(nuevo), peso_tendencia, peso_brecha, peso_evidencia, peso_vencimiento, peso_visita, umbral_bajo, umbral_medio, dias_aviso_vencimiento, horizonte_visita_dias })
    },
    onSuccess: (c) => { void qc.invalidateQueries(); setSel(c.id); setNuevo(''); avisar('Configuración propia creada a partir de la global.') },
    onError: (e) => avisar(e.message, 'error'),
  })
  if (q.isLoading) return <Cargando />
  if (q.error) return <MensajeError error={q.error} />
  const lista = q.data ?? []
  const actual = lista.find((c) => c.id === sel) ?? lista.find((c) => c.programa === null) ?? lista[0]
  const sinConfig = (progs ?? []).filter((p) => !lista.some((c) => c.programa === p.id))
  return (
    <>
      <Encabezado titulo="Configuración de alertas" subtitulo="Ajuste los pesos del índice de riesgo y los umbrales del semáforo, de forma global o por programa, sin modificar el código." />
      <div className="mb-5 flex flex-wrap items-end gap-2">
        {lista.map((c) => (
          <button key={c.id} onClick={() => setSel(c.id)}
            className={clsx('rounded-full px-3.5 py-1.5 text-sm font-medium', actual?.id === c.id ? 'bg-marca-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}>
            {c.programa_nombre ?? 'Global (todos los programas)'}
          </button>
        ))}
        {sinConfig.length > 0 && (
          <div className="flex items-center gap-2">
            <select className="campo py-1.5" value={nuevo} onChange={(e) => setNuevo(e.target.value)} aria-label="Programa para configuración propia">
              <option value="">Configuración propia para…</option>
              {sinConfig.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <button className="btn-secundario" disabled={!nuevo || crear.isPending} onClick={() => crear.mutate()}><Plus className="size-4" /> Crear</button>
          </div>
        )}
      </div>
      {actual && <Editor key={actual.id} cfg={actual} />}
    </>
  )
}
