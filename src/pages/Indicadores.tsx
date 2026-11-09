import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, descargar, solicitud } from '../api/cliente'
import { useFactores, useProgramas, useResponsables } from '../api/consultas'
import type { Indicador } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { useAvisos } from '../components/avisos'
import { Barra, Campo, Cargando, Encabezado, Filtros, Insignia, MensajeError, Modal, NivelRiesgo, Selector, TablaContenedor, Vacio } from '../components/ui'
import { ESTADO_INDICADOR, meta, TENDENCIA, valor } from '../lib/formato'

type FormIndicador = {
  programa: string; factor: string; codigo: string; nombre: string; descripcion: string; tipo_meta: string; meta: string
  unidad: string; periodicidad: string; fuente_verificacion: string; responsable: string; requiere_evidencia: boolean
}

export function FormularioIndicador({ inicial, cerrar }: { inicial?: Indicador; cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const { usuario } = useSesion()
  const { data: progs } = useProgramas()
  const { data: factores } = useFactores()
  const { data: resp } = useResponsables()
  const [d, setD] = useState<FormIndicador>({
    programa: String(inicial?.programa ?? (usuario?.es_global ? '' : (usuario?.programas[0] ?? ''))),
    factor: String(inicial?.factor ?? ''), codigo: inicial?.codigo ?? '', nombre: inicial?.nombre ?? '',
    descripcion: inicial?.descripcion ?? '', tipo_meta: inicial?.tipo_meta ?? 'MAYOR_IGUAL', meta: inicial?.meta ?? '',
    unidad: inicial?.unidad ?? 'PORCENTAJE', periodicidad: inicial?.periodicidad ?? 'SEMESTRAL',
    fuente_verificacion: inicial?.fuente_verificacion ?? '', responsable: String(inicial?.responsable ?? ''),
    requiere_evidencia: inicial?.requiere_evidencia ?? true,
  })
  const set = (k: keyof FormIndicador) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setD({ ...d, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value })
  const m = useMutation({
    mutationFn: () => {
      const cuerpo = { ...d, responsable: d.responsable || null }
      return inicial ? api.patch(`indicadores/${inicial.id}/`, cuerpo) : api.post('indicadores/', cuerpo)
    },
    onSuccess: () => {
      void qc.invalidateQueries()
      avisar(inicial ? 'Indicador actualizado.' : 'Indicador creado.')
      cerrar()
    },
    onError: (e) => avisar(e.message, 'error'),
  })
  const valido = d.programa && d.factor && d.codigo && d.nombre && d.meta !== ''
  return (
    <Modal abierto cerrar={cerrar} titulo={inicial ? `Editar ${inicial.codigo}` : 'Nuevo indicador'} ancho="max-w-2xl"
      pie={<><button className="btn-secundario" onClick={cerrar}>Cancelar</button>
        <button className="btn-primario" disabled={!valido || m.isPending} onClick={() => m.mutate()}>Guardar indicador</button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Programa *">
          <select className="campo" value={d.programa} onChange={set('programa')} disabled={!!inicial}>
            <option value="">Seleccione…</option>
            {progs?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Factor de calidad *">
          <select className="campo" value={d.factor} onChange={set('factor')}>
            <option value="">Seleccione…</option>
            {factores?.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Código *"><input className="campo" value={d.codigo} onChange={set('codigo')} placeholder="IND-013" maxLength={20} /></Campo>
        <Campo etiqueta="Nombre *"><input className="campo" value={d.nombre} onChange={set('nombre')} maxLength={200} /></Campo>
        <div className="sm:col-span-2">
          <Campo etiqueta="Descripción"><textarea className="campo" rows={2} value={d.descripcion} onChange={set('descripcion')} /></Campo>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:col-span-2">
          <Campo etiqueta="Tipo de meta">
            <select className="campo" value={d.tipo_meta} onChange={set('tipo_meta')}>
              <option value="MAYOR_IGUAL">≥ Mayor o igual</option>
              <option value="MENOR_IGUAL">≤ Menor o igual</option>
            </select>
          </Campo>
          <Campo etiqueta="Meta *"><input type="number" step="any" className="campo" value={d.meta} onChange={set('meta')} /></Campo>
          <Campo etiqueta="Unidad">
            <select className="campo" value={d.unidad} onChange={set('unidad')}>
              <option value="PORCENTAJE">%</option><option value="NUMERO">Número</option><option value="ESCALA">Escala (1–5)</option>
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Periodicidad" ayuda="Define cuándo se considera desactualizado">
          <select className="campo" value={d.periodicidad} onChange={set('periodicidad')}>
            <option value="MENSUAL">Mensual</option><option value="TRIMESTRAL">Trimestral</option>
            <option value="SEMESTRAL">Semestral</option><option value="ANUAL">Anual</option>
          </select>
        </Campo>
        <Campo etiqueta="Responsable">
          <select className="campo" value={d.responsable} onChange={set('responsable')}>
            <option value="">Sin asignar</option>
            {resp?.map((u) => <option key={u.id} value={u.id}>{u.nombre} · {u.cargo}</option>)}
          </select>
        </Campo>
        <div className="sm:col-span-2">
          <Campo etiqueta="Fuente de verificación"><input className="campo" value={d.fuente_verificacion} onChange={set('fuente_verificacion')} placeholder="Ej. Registro académico, SPADIES" /></Campo>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={d.requiere_evidencia} onChange={set('requiere_evidencia')} className="size-4" /> Requiere evidencia documental
        </label>
      </div>
    </Modal>
  )
}

function Importar({ cerrar }: { cerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useAvisos()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [res, setRes] = useState<{ creados: number; actualizados: number; errores: string[] } | null>(null)
  const m = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('archivo', archivo!)
      return solicitud<{ creados: number; actualizados: number; errores: string[] }>('indicadores/importar/', { method: 'POST', cuerpo: fd })
    },
    onSuccess: (r) => {
      setRes(r)
      void qc.invalidateQueries()
    },
    onError: (e) => avisar(e.message, 'error'),
  })
  return (
    <Modal abierto cerrar={cerrar} titulo="Importar indicadores desde Excel" pie={<>
      <button className="btn-secundario" onClick={cerrar}>Cerrar</button>
      <button className="btn-primario" disabled={!archivo || m.isPending} onClick={() => m.mutate()}>Importar</button></>}>
      <p className="mb-3 text-sm text-slate-600">
        Use la plantilla. Columnas: programa (código), factor (código), codigo, nombre, descripcion, tipo_meta (&gt;= o &lt;=), meta, unidad, periodicidad, fuente, responsable (correo). Si el código ya existe en el programa, se actualiza.
      </p>
      <button className="btn-secundario btn-chico mb-4" onClick={() => void descargar('indicadores/plantilla/')}><Download className="size-3.5" /> Descargar plantilla</button>
      <input type="file" accept=".xlsx" className="campo" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} aria-label="Archivo Excel" />
      {res && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p><strong>{res.creados}</strong> creados · <strong>{res.actualizados}</strong> actualizados</p>
          {res.errores.length > 0 && <ul className="mt-2 list-disc pl-5 text-red-700">{res.errores.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}
    </Modal>
  )
}

export default function Indicadores() {
  const { esGlobal, tieneRol } = useSesion()
  const [sp, setSp] = useSearchParams()
  const [nuevo, setNuevo] = useState(false)
  const [importar, setImportar] = useState(false)
  const f = { programa: sp.get('programa') ?? '', factor: sp.get('factor') ?? '', estado: sp.get('estado') ?? '', responsable: sp.get('responsable') ?? '' }
  const [texto, setTexto] = useState(sp.get('q') ?? '')
  const setF = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v)
    else n.delete(k)
    setSp(n, { replace: true })
  }
  const { data: progs } = useProgramas()
  const { data: factores } = useFactores()
  const { data: resp } = useResponsables()
  const q = useQuery({ queryKey: ['indicadores', f], queryFn: () => api.get<Indicador[]>('indicadores/', f) })
  const lista = useMemo(() => {
    const t = texto.trim().toLowerCase()
    return (q.data ?? []).filter((i) => !t || i.codigo.toLowerCase().includes(t) || i.nombre.toLowerCase().includes(t))
  }, [q.data, texto])
  const puedeCrear = tieneRol('ADMIN', 'COORDINADOR', 'DIRECTOR')

  return (
    <>
      <Encabezado titulo="Indicadores" subtitulo={`${lista.length} indicadores`} acciones={puedeCrear && <>
        {esGlobal && <button className="btn-secundario" onClick={() => setImportar(true)}><FileSpreadsheet className="size-4" /> Importar Excel</button>}
        <button className="btn-primario" onClick={() => setNuevo(true)}><Plus className="size-4" /> Nuevo indicador</button>
      </>} />
      <Filtros>
        <label className="relative min-w-56 flex-1">
          <span className="mb-1 block text-xs font-medium text-slate-500">Buscar</span>
          <Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-slate-400" />
          <input className="campo py-1.5 pl-9" placeholder="Código o nombre…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <Selector etiqueta="Programa" valor={f.programa} cambiar={(v) => setF('programa', v)} opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
        <Selector etiqueta="Factor" valor={f.factor} cambiar={(v) => setF('factor', v)} opciones={(factores ?? []).map((x) => ({ valor: x.id, texto: x.nombre }))} />
        <Selector etiqueta="Estado" valor={f.estado} cambiar={(v) => setF('estado', v)} opciones={Object.entries(ESTADO_INDICADOR).map(([k, v]) => ({ valor: k, texto: v.texto }))} />
        <Selector etiqueta="Responsable" valor={f.responsable} cambiar={(v) => setF('responsable', v)} opciones={(resp ?? []).map((r) => ({ valor: r.id, texto: r.nombre }))} />
      </Filtros>
      {q.isLoading && <Cargando />}
      {q.error && <MensajeError error={q.error} />}
      {q.data && (
        <TablaContenedor>
          {lista.length === 0 ? <Vacio titulo="No hay indicadores con estos filtros" /> : (
            <table className="tabla">
              <thead><tr>
                <th>Código</th><th>Nombre</th><th>Programa</th><th>Factor</th><th>Meta</th><th>Último valor</th>
                <th>Cumplimiento</th><th>Tend.</th><th>Periodicidad</th><th>Responsable</th><th>Estado</th><th>Riesgo</th>
              </tr></thead>
              <tbody>
                {lista.map((i) => (
                  <tr key={i.id}>
                    <td className="font-mono text-xs"><Link to={`/indicadores/${i.id}`} className="text-marca-600 hover:underline">{i.codigo}</Link></td>
                    <td className="min-w-48"><Link to={`/indicadores/${i.id}`} className="font-medium hover:underline">{i.nombre}</Link></td>
                    <td className="whitespace-nowrap text-slate-600">{i.programa_nombre}</td>
                    <td className="whitespace-nowrap text-slate-500">{i.factor_nombre}</td>
                    <td className="whitespace-nowrap">{meta(i)}</td>
                    <td className="whitespace-nowrap">{valor(i.ultimo_valor, i.unidad)}</td>
                    <td className="min-w-28">
                      {i.cumplimiento === null ? '—' : <div className="flex items-center gap-2"><Barra valor={i.cumplimiento} color={i.cumplimiento >= 100 ? '#15803d' : i.cumplimiento >= 80 ? '#b45309' : '#b91c1c'} /><span className="w-10 text-right text-xs">{Math.round(i.cumplimiento)}%</span></div>}
                    </td>
                    <td className={`text-lg ${TENDENCIA[i.tendencia].clase}`} title={TENDENCIA[i.tendencia].texto}>{TENDENCIA[i.tendencia].simbolo}</td>
                    <td className="text-slate-500">{i.periodicidad_display}</td>
                    <td className="whitespace-nowrap">{i.responsable_nombre ?? '—'}</td>
                    <td><Insignia clase={ESTADO_INDICADOR[i.estado].clase}>{ESTADO_INDICADOR[i.estado].texto}</Insignia></td>
                    <td><NivelRiesgo nivel={i.riesgo?.nivel} puntaje={i.riesgo?.puntaje} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TablaContenedor>
      )}
      {nuevo && <FormularioIndicador cerrar={() => setNuevo(false)} />}
      {importar && <Importar cerrar={() => setImportar(false)} />}
    </>
  )
}
