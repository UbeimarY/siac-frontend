import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AlertOctagon, CheckCircle2, ClipboardList, Clock, FolderOpen, Gauge } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/cliente'
import { useFactores, usePeriodos, useProgramas, useResponsables } from '../api/consultas'
import type { Nivel, Tablero } from '../api/tipos'
import { useSesion } from '../auth/AuthContext'
import { Barra, Cargando, Encabezado, Filtros, Insignia, MensajeError, NivelRiesgo, Selector } from '../components/ui'
import { fecha, NIVEL, SEVERIDAD } from '../lib/formato'

function Kpi({ titulo, valor, detalle, icono: Icono, tono, a }: {
  titulo: string; valor: React.ReactNode; detalle: React.ReactNode; icono: typeof Gauge; tono: string; a?: string
}) {
  const cuerpo = (
    <div className="tarjeta h-full p-5 transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
        <span className={clsx('rounded-lg p-1.5', tono)}>
          <Icono className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{valor}</div>
      <div className="mt-1 text-sm text-slate-500">{detalle}</div>
    </div>
  )
  return a ? <Link to={a} className="block">{cuerpo}</Link> : cuerpo
}

function celdaColor(nivel: Nivel | null) {
  return nivel ? { background: NIVEL[nivel].fondo, color: NIVEL[nivel].color } : { background: '#f8fafc', color: '#94a3b8' }
}

export default function Inicio() {
  const { usuario } = useSesion()
  const [sp, setSp] = useSearchParams()
  const f = { programa: sp.get('programa') ?? '', periodo: sp.get('periodo') ?? '', responsable: sp.get('responsable') ?? '', factor: sp.get('factor') ?? '' }
  const setF = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v)
    else n.delete(k)
    setSp(n, { replace: true })
  }
  const { data: progs } = useProgramas()
  const { data: periodos } = usePeriodos()
  const { data: factores } = useFactores()
  const { data: responsables } = useResponsables()
  const q = useQuery({ queryKey: ['tablero', f], queryFn: () => api.get<Tablero>('tablero/', f) })
  const t = q.data

  return (
    <>
      <Encabezado
        titulo={usuario?.es_global ? 'Panel del campus' : 'Panel de seguimiento'}
        subtitulo={`Seguimiento SIAC · Campus Pasto · Periodo ${t?.periodo ?? '…'}`}
      />
      <Filtros>
        <Selector etiqueta="Programa" valor={f.programa} cambiar={(v) => setF('programa', v)} opciones={(progs ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
        <Selector etiqueta="Periodo" valor={f.periodo} cambiar={(v) => setF('periodo', v)} todos="Último registro" opciones={(periodos ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))} />
        <Selector etiqueta="Factor" valor={f.factor} cambiar={(v) => setF('factor', v)} opciones={(factores ?? []).map((x) => ({ valor: x.id, texto: x.nombre }))} />
        <Selector etiqueta="Responsable" valor={f.responsable} cambiar={(v) => setF('responsable', v)} opciones={(responsables ?? []).map((r) => ({ valor: r.id, texto: r.nombre }))} />
      </Filtros>

      {q.isLoading && <Cargando />}
      {q.error && <MensajeError error={q.error} reintentar={() => q.refetch()} />}
      {t && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              titulo="Riesgo promedio"
              icono={Gauge}
              tono="bg-amber-50 text-amber-600"
              valor={<span style={{ color: t.kpis.nivel_riesgo ? NIVEL[t.kpis.nivel_riesgo].color : undefined }}>{t.kpis.riesgo_promedio}<span className="text-base font-medium text-slate-400">/100</span></span>}
              detalle={t.kpis.nivel_riesgo ? `Nivel ${NIVEL[t.kpis.nivel_riesgo].texto.toLowerCase()}` : 'Sin datos'}
            />
            <Kpi
              titulo="Indicadores al día"
              icono={CheckCircle2}
              tono="bg-green-50 text-green-600"
              a="/indicadores?estado=AL_DIA"
              valor={<>{t.kpis.indicadores_al_dia}<span className="text-base font-medium text-slate-400">/{t.kpis.indicadores_total}</span></>}
              detalle={`${t.kpis.porcentaje_al_dia}% de cumplimiento · ${t.kpis.indicadores_desactualizados} desactualizados`}
            />
            <Kpi
              titulo="Evidencias pendientes"
              icono={FolderOpen}
              tono="bg-sky-50 text-sky-600"
              a="/evidencias?estado=PENDIENTE"
              valor={t.kpis.evidencias_pendientes_revision}
              detalle={`por revisar · ${t.kpis.evidencias_por_cargar} por cargar (${t.kpis.evidencias_vencidas} vencidas)`}
            />
            <Kpi
              titulo="Acciones de mejora"
              icono={ClipboardList}
              tono="bg-violet-50 text-violet-600"
              a="/planes"
              valor={t.kpis.acciones_abiertas}
              detalle={<>abiertas · <span className={t.kpis.acciones_retrasadas ? 'font-medium text-red-600' : ''}>{t.kpis.acciones_retrasadas} retrasadas</span></>}
            />
            <Kpi
              titulo="Alertas altas"
              icono={AlertOctagon}
              tono="bg-red-50 text-red-600"
              a="/alertas?severidad=ALTA"
              valor={<span className="text-red-600">{t.kpis.alertas_altas}</span>}
              detalle={`de ${t.kpis.alertas_activas} alertas activas`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <section className="tarjeta p-5 xl:col-span-2" aria-labelledby="t-riesgo">
              <h2 id="t-riesgo" className="mb-1 font-semibold text-marca-900">Índice de riesgo por programa</h2>
              <p className="mb-4 text-xs text-slate-500">Bajo ≤ {t.umbrales.bajo} · Medio ≤ {t.umbrales.medio} · Alto &gt; {t.umbrales.medio}</p>
              <ul className="space-y-4">
                {t.riesgo_programas.map((p) => (
                  <li key={p.id}>
                    <Link to={`/programas/${p.id}`} className="group block">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-700 group-hover:text-marca-700">{p.programa}</span>
                        <NivelRiesgo nivel={p.nivel} puntaje={p.riesgo} />
                      </div>
                      <Barra valor={p.riesgo ?? 0} color={p.nivel ? NIVEL[p.nivel].color : undefined} />
                      <div className="mt-1 text-xs text-slate-500">{p.estado} · {p.al_dia}/{p.indicadores} indicadores al día</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="tarjeta p-5 xl:col-span-3" aria-labelledby="t-mapa">
              <h2 id="t-mapa" className="mb-1 font-semibold text-marca-900">Mapa de calor: programas × factores</h2>
              <p className="mb-4 text-xs text-slate-500">Índice de riesgo por factor de calidad. Pase el cursor para ver el nombre del factor.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1 text-center text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-slate-500" scope="col">Programa</th>
                      {t.factores.map((fa) => (
                        <th key={fa.id} scope="col" className="text-xs font-semibold text-slate-500" title={fa.nombre}>
                          <abbr title={fa.nombre} className="no-underline">{fa.abreviatura}</abbr>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.mapa_calor.map((fila) => (
                      <tr key={fila.programa_id}>
                        <th scope="row" className="whitespace-nowrap pr-2 text-left text-sm font-medium text-slate-700">{fila.programa}</th>
                        {fila.celdas.map((c, i) => (
                          <td key={c.factor_id} className="h-10 min-w-12 rounded-lg font-semibold" style={celdaColor(c.nivel)}
                            title={`${fila.programa} · ${t.factores[i]?.nombre}: ${c.valor ?? 'sin indicadores'}`}>
                            {c.valor === null ? '—' : Math.round(c.valor)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {t.factores.map((fa) => <span key={fa.id}><strong>{fa.abreviatura}</strong> {fa.nombre}</span>)}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <section className="tarjeta xl:col-span-3" aria-labelledby="t-alertas">
              <div className="flex items-center justify-between p-5 pb-3">
                <h2 id="t-alertas" className="font-semibold text-marca-900">Alertas prioritarias</h2>
                <Link to="/alertas" className="text-sm font-medium text-marca-600 hover:underline">Ver todas</Link>
              </div>
              {t.ultimas_alertas.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-slate-500">No hay alertas activas con los filtros seleccionados.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {t.ultimas_alertas.map((a) => (
                    <li key={a.id} className="flex gap-3 px-5 py-3">
                      <span className={clsx('mt-1.5 size-2.5 shrink-0 rounded-full', SEVERIDAD[a.severidad].punto)} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Insignia clase={SEVERIDAD[a.severidad].clase}>{SEVERIDAD[a.severidad].texto}</Insignia>
                          <span className="text-xs font-medium text-slate-500">{a.tipo}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-800">{a.titulo}</p>
                        <p className="text-xs text-slate-500">{a.programa} · {a.responsable ?? 'Sin responsable'} · {fecha(a.fecha)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="tarjeta xl:col-span-2" aria-labelledby="t-resp">
              <div className="p-5 pb-3">
                <h2 id="t-resp" className="font-semibold text-marca-900">Cumplimiento por responsable</h2>
                <p className="text-xs text-slate-500">Promedio de cumplimiento de sus indicadores</p>
              </div>
              <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                {t.responsables.map((r) => (
                  <li key={r.id} className="px-5 py-3">
                    <button className="w-full text-left" onClick={() => setF('responsable', String(r.id))} title="Filtrar por este responsable">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{r.nombre}</span>
                        <span className="text-slate-500">{r.cumplimiento_promedio ?? '—'}%</span>
                      </div>
                      <div className="mt-1.5"><Barra valor={r.cumplimiento_promedio ?? 0} color={(r.cumplimiento_promedio ?? 0) >= 100 ? '#15803d' : (r.cumplimiento_promedio ?? 0) >= 90 ? '#b45309' : '#b91c1c'} /></div>
                      <div className="mt-1 text-xs text-slate-500">{r.al_dia}/{r.indicadores} al día · {r.alertas} alertas</div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
