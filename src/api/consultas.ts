import { useQuery } from '@tanstack/react-query'
import { api } from './cliente'
import type { EstadoIABeta, Factor, Periodo, PrediccionBeta, Programa, UsuarioMin } from './tipos'

const largo = { staleTime: 5 * 60_000 }

export const useProgramas = () => useQuery({ queryKey: ['programas'], queryFn: () => api.get<Programa[]>('programas/') })
export const useFactores = () => useQuery({ queryKey: ['factores'], queryFn: () => api.get<Factor[]>('factores/'), ...largo })
export const usePeriodos = () => useQuery({ queryKey: ['periodos'], queryFn: () => api.get<Periodo[]>('periodos/'), ...largo })
export const useResponsables = () =>
  useQuery({ queryKey: ['usuarios', 'opciones'], queryFn: () => api.get<UsuarioMin[]>('usuarios/opciones/'), ...largo })
export const useEstadoIA = () =>
  useQuery({ queryKey: ['ia', 'estado'], queryFn: () => api.get<{ disponible: boolean; modelo: string | null }>('ia/estado/'), ...largo })
export const useIndicadoresOpciones = (programa?: string | number) =>
  useQuery({
    queryKey: ['indicadores', 'opciones', programa ?? ''],
    queryFn: () => api.get<{ id: number; codigo: string; nombre: string; programa_id: number }[]>('indicadores/opciones/', { programa }),
  })
/** Estado de la IA Beta; mientras se entrena, se consulta cada 5 segundos hasta que termine. */
export const useEstadoIABeta = () =>
  useQuery({
    queryKey: ['ia-beta', 'estado'],
    queryFn: () => api.get<EstadoIABeta>('ia/beta/estado/'),
    refetchInterval: (q) => (q.state.data?.entrenando ? 5000 : false),
  })
export const usePrediccionesBeta = (filtros: { programa?: string | number; indicador?: string | number } = {}, activo = true) =>
  useQuery({
    queryKey: ['ia-beta', 'predicciones', filtros],
    queryFn: () => api.get<{ modelo: { version: number; entrenado: string } | null; resultados: PrediccionBeta[] }>('ia/beta/predicciones/', filtros),
    enabled: activo,
  })
