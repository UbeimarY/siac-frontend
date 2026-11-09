export type Rol = 'ADMIN' | 'COORDINADOR' | 'DIRECTOR' | 'RESPONSABLE' | 'CONSULTA'
export type Nivel = 'BAJO' | 'MEDIO' | 'ALTO'
export type Severidad = 'ALTA' | 'MEDIA' | 'BAJA'
export type EstadoIndicador = 'AL_DIA' | 'ALERTA' | 'EN_RIESGO' | 'DESACTUALIZADO' | 'SIN_DATOS'
export type Tendencia = 'MEJORA' | 'ESTABLE' | 'DETERIORO' | 'SIN_DATOS'

export interface Usuario {
  id: number
  email: string
  first_name: string
  last_name: string
  nombre: string
  iniciales: string
  rol: Rol
  rol_display: string
  cargo: string
  programas: number[]
  programas_nombres: string[]
  is_active: boolean
  es_global: boolean
  last_login: string | null
}

export interface UsuarioMin {
  id: number
  nombre: string
  email: string
  iniciales: string
  rol: Rol
  cargo: string
}

export interface Programa {
  id: number
  codigo: string
  nombre: string
  nombre_corto: string
  facultad: string
  estado: string
  estado_display: string
  detalle_estado: string
  fecha_visita_pares: string | null
  dias_para_visita: number | null
  director: number | null
  director_nombre: string | null
  activo: boolean
  riesgo?: number | null
  nivel?: Nivel | null
  alertas_activas?: number
  alertas_altas?: number
  indicadores_total?: number
  indicadores_al_dia?: number
  config_propia?: boolean
  semaforo_factores?: { factor_id: number; factor: string; abreviatura: string; riesgo: number | null; nivel: Nivel | null; indicadores: number }[]
  alertas?: { id: number; tipo: string; severidad: Severidad; titulo: string }[]
}

export interface Factor {
  id: number
  codigo: string
  nombre: string
  abreviatura: string
}

export interface Periodo {
  id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  activo: boolean
}

export interface ComponenteRiesgo {
  factor: number
  peso: number
  aporte: number
  valor?: string
  cumplimiento?: number | null
}

export interface Indicador {
  id: number
  programa: number
  programa_nombre: string
  factor: number
  factor_nombre: string
  factor_abreviatura: string
  codigo: string
  nombre: string
  descripcion: string
  tipo_meta: 'MAYOR_IGUAL' | 'MENOR_IGUAL'
  meta: string
  unidad: 'PORCENTAJE' | 'NUMERO' | 'ESCALA'
  periodicidad: string
  periodicidad_display: string
  fuente_verificacion: string
  responsable: number | null
  responsable_nombre: string | null
  requiere_evidencia: boolean
  activo: boolean
  ultimo_valor: string | null
  ultima_fecha: string | null
  cumplimiento: number | null
  tendencia: Tendencia
  estado: EstadoIndicador
  proxima_actualizacion: string
  riesgo: { puntaje: number; nivel: Nivel; componentes: Record<string, ComponenteRiesgo> } | null
  evidencias_vigentes: number
}

export interface RegistroIndicador {
  id: number
  periodo: number
  periodo_nombre: string
  valor: string
  fecha_corte: string
  observaciones: string
  registrado_por_nombre: string | null
  cumplimiento: number | null
}

export interface RevisionIA {
  corresponde: 'SI' | 'PARCIAL' | 'NO'
  confianza: 'ALTA' | 'MEDIA' | 'BAJA'
  periodo_detectado: string | null
  valor_detectado: string | null
  resumen: string
  observaciones: string[]
  faltantes: string[]
  fecha: string
}

export interface Evidencia {
  id: number
  codigo: string
  indicador: number
  indicador_codigo: string
  indicador_nombre: string
  programa_id: number
  programa_nombre: string
  periodo: number | null
  periodo_nombre: string | null
  nombre: string
  descripcion: string
  tipo: 'ARCHIVO' | 'ENLACE'
  nombre_archivo: string
  enlace: string
  tipo_documento: string
  vigencia_desde: string | null
  vigencia_hasta: string | null
  fecha_limite: string | null
  estado: 'POR_CARGAR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'
  estado_visible: 'POR_CARGAR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA'
  responsable: number | null
  responsable_nombre: string | null
  cargado_por_nombre: string | null
  fecha_carga: string | null
  revisado_por_nombre: string | null
  fecha_revision: string | null
  observaciones_revision: string
  revision_ia: RevisionIA | null
  tiene_archivo: boolean
}

export interface Alerta {
  id: number
  tipo: string
  tipo_display: string
  severidad: Severidad
  estado: string
  estado_display: string
  programa: number
  programa_nombre: string
  indicador: number | null
  indicador_codigo: string | null
  plan_codigo: string | null
  evidencia_codigo: string | null
  titulo: string
  detalle: string
  puntaje_riesgo: number
  responsable: number | null
  responsable_nombre: string | null
  fecha_generacion: string
  fecha_cierre: string | null
  cerrada_por_nombre: string | null
  comentario_cierre: string
  planes_asociados: { id: number; codigo: string }[]
}

export interface Plan {
  id: number
  codigo: string
  programa: number
  programa_nombre: string
  indicador: number | null
  indicador_codigo: string | null
  alerta_origen: number | null
  accion: string
  descripcion: string
  meta_esperada: string
  responsable: number | null
  responsable_nombre: string | null
  fecha_inicio: string
  fecha_limite: string
  avance: number
  avance_esperado: number
  estado: string
  estado_visible: string
  generado_con_ia: boolean
}

export interface ConfiguracionRiesgo {
  id: number
  programa: number | null
  programa_nombre: string | null
  peso_tendencia: number
  peso_brecha: number
  peso_evidencia: number
  peso_vencimiento: number
  peso_visita: number
  umbral_bajo: number
  umbral_medio: number
  dias_aviso_vencimiento: number
  horizonte_visita_dias: number
  actualizado_por_nombre: string | null
  actualizado: string
}

export interface RegistroBitacora {
  id: number
  fecha: string
  usuario_nombre: string
  usuario_iniciales: string
  modulo: string
  modulo_display: string
  accion: string
  programa_nombre: string | null
}

export interface Tablero {
  periodo: string | null
  kpis: {
    riesgo_promedio: number
    nivel_riesgo: Nivel | null
    indicadores_total: number
    indicadores_al_dia: number
    porcentaje_al_dia: number
    indicadores_desactualizados: number
    evidencias_pendientes_revision: number
    evidencias_por_cargar: number
    evidencias_vencidas: number
    acciones_abiertas: number
    acciones_retrasadas: number
    alertas_activas: number
    alertas_altas: number
  }
  umbrales: { bajo: number; medio: number }
  riesgo_programas: { id: number; programa: string; nombre_corto: string; riesgo: number | null; nivel: Nivel | null; estado: string; indicadores: number; al_dia: number }[]
  factores: { id: number; nombre: string; abreviatura: string }[]
  mapa_calor: { programa_id: number; programa: string; celdas: { factor_id: number; valor: number | null; nivel: Nivel | null }[] }[]
  responsables: { id: number; nombre: string; indicadores: number; cumplimiento_promedio: number | null; al_dia: number; alertas: number }[]
  ultimas_alertas: { id: number; severidad: Severidad; tipo: string; titulo: string; programa: string; responsable: string | null; fecha: string }[]
}

export interface SugerenciaPlan {
  accion: string
  descripcion: string
  meta_esperada: string
  rol_responsable: string
  fecha_inicio: string
  fecha_limite: string
}
