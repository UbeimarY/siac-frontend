import { useQuery } from '@tanstack/react-query'
import { api } from './cliente'
import type { Factor, Periodo, Programa, UsuarioMin } from './tipos'

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
