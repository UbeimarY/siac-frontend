import { useMutation, useQuery } from '@tanstack/react-query'
import { ClipboardList, FileSpreadsheet, FileText, Landmark, LineChart, Loader2, PieChart, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { api, descargar } from '../api/cliente'
import { useEstadoIA, useFactores, usePeriodos, useProgramas, useResponsables } from '../api/consultas'
import { useAvisos } from '../components/avisos'
import { Campo, Encabezado, Filtros, Modal, Selector } from '../components/ui'

const ICONOS: Record<string, typeof PieChart> = { estado_programa: PieChart, visita_pares: Landmark, seguimiento_indicadores: LineChart, planes: ClipboardList }

export default function Reportes() {
  const avisar = useAvisos()
  const ia = useEstadoIA()
  const { data: progs } = useProgramas()
  const { data: periodos } = usePeriodos()
  const { data: factores } = useFactores()
  const { data: resp } = useResponsables()
  const [f, setF] = useState({ programa: '', periodo: '', responsable: '', factor: '' })
  const [generando, setGenerando] = useState<string | null>(null)
  const [resumen, setResumen] = useState<{ tipo: string; texto: string } | null>(null)
  const tipos = useQuery({ queryKey: ['reportes', 'tipos'], queryFn: () => api.get<{ tipo: string; titulo: string; descripcion: string }[]>('reportes/') })

  const exportar = async (tipo: string, formato: 'pdf' | 'xlsx', resumenIA?: string) => {
    setGenerando(`${tipo}-${formato}`)
    try {
      if (resumenIA) await descargar(`reportes/${tipo}/`, { ...f, formato }, { method: 'POST', cuerpo: { resumen_ia: resumenIA } })
      else await descargar(`reportes/${tipo}/`, { ...f, formato })
      avisar('Reporte generado.')
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setGenerando(null)
    }
  }
  const resumir = useMutation({
    mutationFn: (tipo: string) => api.post<{ resumen: string; tipo: string }>('ia/resumen/', { tipo, ...f }),
    onSuccess: (r) => setResumen({ tipo: r.tipo, texto: r.resumen }),
    onError: (e) => avisar(e.message, 'error'),
  })

  return (
    <>
      <Encabezado titulo="Reportes" subtitulo="Genere y exporte reportes del SIAC en PDF o Excel" />
      <Filtros>
        <Selector etiqueta="Programa" valor={f.programa} cambiar={(v) => setF({ ...f, programa: v })} todos="Todos los programas" opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
        <Selector etiqueta="Periodo" valor={f.periodo} cambiar={(v) => setF({ ...f, periodo: v })} todos="Último registro" opciones={(periodos ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
        <Selector etiqueta="Factor" valor={f.factor} cambiar={(v) => setF({ ...f, factor: v })} opciones={(factores ?? []).map((x) => ({ valor: x.id, texto: x.nombre }))} />
        <Selector etiqueta="Responsable" valor={f.responsable} cambiar={(v) => setF({ ...f, responsable: v })} opciones={(resp ?? []).map((r) => ({ valor: r.id, texto: r.nombre }))} />
      </Filtros>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tipos.data?.map((t) => {
          const Icono = ICONOS[t.tipo] ?? FileText
          return (
            <section key={t.tipo} className="tarjeta flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-marca-50 p-2.5 text-marca-700"><Icono className="size-5" /></span>
                <div>
                  <h2 className="font-semibold text-marca-900">{t.titulo}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t.descripcion}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <button className="btn-primario" disabled={!!generando} onClick={() => void exportar(t.tipo, 'pdf')}>
                  {generando === `${t.tipo}-pdf` ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Exportar PDF
                </button>
                <button className="btn-secundario" disabled={!!generando} onClick={() => void exportar(t.tipo, 'xlsx')}>
                  {generando === `${t.tipo}-xlsx` ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Exportar Excel
                </button>
                {ia.data?.disponible && (
                  <button className="btn-secundario text-violet-700" disabled={resumir.isPending} onClick={() => resumir.mutate(t.tipo)}>
                    {resumir.isPending && resumir.variables === t.tipo ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Resumen con IA
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>
      {resumen && (
        <Modal abierto ancho="max-w-2xl" cerrar={() => setResumen(null)} titulo="Resumen ejecutivo generado con IA" pie={<>
          <button className="btn-secundario" onClick={() => setResumen(null)}>Cerrar</button>
          <button className="btn-secundario" onClick={() => void navigator.clipboard.writeText(resumen.texto).then(() => avisar('Resumen copiado.'))}>Copiar</button>
          <button className="btn-primario" disabled={!!generando} onClick={() => void exportar(resumen.tipo, 'pdf', resumen.texto)}>
            {generando ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Exportar PDF con resumen</button></>}>
          <p className="mb-3 text-sm text-slate-600">Revise y edite el texto antes de incluirlo en el reporte. La IA solo usa las cifras del sistema, pero la responsabilidad del contenido es suya.</p>
          <Campo etiqueta="Resumen"><textarea rows={12} className="campo leading-relaxed" value={resumen.texto} onChange={(e) => setResumen({ ...resumen, texto: e.target.value })} /></Campo>
        </Modal>
      )}
    </>
  )
}
