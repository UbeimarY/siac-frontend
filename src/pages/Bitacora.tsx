import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { api, descargar } from '../api/cliente'
import type { RegistroBitacora } from '../api/tipos'
import { useAvisos } from '../components/avisos'
import { Avatar, Cargando, Encabezado, Filtros, Insignia, MensajeError, Selector, TablaContenedor, Vacio } from '../components/ui'
import { fechaHora } from '../lib/formato'

const MODULOS = [
  ['AUTENTICACION', 'Autenticación'], ['USUARIOS', 'Usuarios'], ['PROGRAMAS', 'Programas'], ['INDICADORES', 'Indicadores'],
  ['EVIDENCIAS', 'Evidencias'], ['ALERTAS', 'Alertas'], ['PLANES', 'Planes'], ['REPORTES', 'Reportes'],
  ['CONFIGURACION', 'Configuración'], ['IA', 'Asistente IA'],
]
const POR_PAGINA = 50

export default function Bitacora() {
  const avisar = useAvisos()
  const [f, setF] = useState({ modulo: '', fecha__date__gte: '', fecha__date__lte: '', search: '' })
  const [pagina, setPagina] = useState(0)
  const params = { ...f, limite: POR_PAGINA, offset: pagina * POR_PAGINA }
  const q = useQuery({ queryKey: ['bitacora', params], queryFn: () => api.get<{ total: number; resultados: RegistroBitacora[] }>('bitacora/', params) })
  const cambiar = (k: string, v: string) => { setF({ ...f, [k]: v }); setPagina(0) }
  const paginas = Math.max(1, Math.ceil((q.data?.total ?? 0) / POR_PAGINA))
  return (
    <>
      <Encabezado titulo="Bitácora del sistema" subtitulo={`Registro de solo lectura · ${q.data?.total ?? 0} entradas`}
        acciones={<button className="btn-secundario" onClick={() => void descargar('bitacora/exportar/', f).catch((e) => avisar(e.message, 'error'))}><Download className="size-4" /> Exportar CSV</button>} />
      <Filtros>
        <Selector etiqueta="Módulo" valor={f.modulo} cambiar={(v) => cambiar('modulo', v)} opciones={MODULOS.map(([v, t]) => ({ valor: v, texto: t }))} />
        <label><span className="mb-1 block text-xs font-medium text-slate-500">Desde</span><input type="date" className="campo py-1.5" value={f.fecha__date__gte} onChange={(e) => cambiar('fecha__date__gte', e.target.value)} /></label>
        <label><span className="mb-1 block text-xs font-medium text-slate-500">Hasta</span><input type="date" className="campo py-1.5" value={f.fecha__date__lte} onChange={(e) => cambiar('fecha__date__lte', e.target.value)} /></label>
        <label className="min-w-48 flex-1"><span className="mb-1 block text-xs font-medium text-slate-500">Buscar acción</span><input className="campo py-1.5" value={f.search} onChange={(e) => cambiar('search', e.target.value)} /></label>
      </Filtros>
      {q.isLoading && <Cargando />}
      {q.error && <MensajeError error={q.error} />}
      {q.data && (
        <TablaContenedor>
          {q.data.resultados.length === 0 ? <Vacio titulo="Sin registros para estos filtros" /> : (
            <table className="tabla">
              <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Programa</th><th>Módulo</th></tr></thead>
              <tbody>
                {q.data.resultados.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap font-mono text-xs text-slate-600">{fechaHora(r.fecha)}</td>
                    <td className="whitespace-nowrap"><div className="flex items-center gap-2"><Avatar iniciales={r.usuario_iniciales} chico />{r.usuario_nombre}</div></td>
                    <td>{r.accion}</td>
                    <td className="text-slate-500">{r.programa_nombre ?? '—'}</td>
                    <td><Insignia clase="bg-marca-50 text-marca-700 ring-marca-100">{r.modulo_display}</Insignia></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TablaContenedor>
      )}
      {paginas > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button className="btn-secundario btn-chico" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span>Página {pagina + 1} de {paginas}</span>
          <button className="btn-secundario btn-chico" disabled={pagina + 1 >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
        </div>
      )}
    </>
  )
}
