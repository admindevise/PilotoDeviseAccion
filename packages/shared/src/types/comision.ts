export enum TipoComision {
  ADMINISTRACION_MENSUAL = 'ADMINISTRACION_MENSUAL',
  INICIAL_ESTRUCTURACION = 'INICIAL_ESTRUCTURACION',
  CESION_DERECHOS = 'CESION_DERECHOS',
  SUSCRIPCION_OTROSI = 'SUSCRIPCION_OTROSI',
  ASISTENCIA_COMITE = 'ASISTENCIA_COMITE',
  VARIABLE_MONETIZACION = 'VARIABLE_MONETIZACION',
  COMISION_FONDOS = 'COMISION_FONDOS',
  ACOMPANAMIENTO_PROCESAL = 'ACOMPANAMIENTO_PROCESAL',
  PRORROGA = 'PRORROGA',
  OTRA = 'OTRA',
}

export enum PeriodicidadComision {
  MENSUAL = 'MENSUAL',
  TRIMESTRAL = 'TRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL',
  POR_EVENTO = 'POR_EVENTO',
  UNICA = 'UNICA',
}

export interface FormulaDetalle {
  base: string;
  multiplicador: number;
  tipo: 'fijo' | 'porcentaje' | 'mayor_entre';
  condiciones?: string;
}

export interface ReglaComision {
  id: string;
  fideicomisoId: string;
  contratoId: string;
  tipo: TipoComision;
  nombre: string;
  formula: string;
  formulaDetalle: FormulaDetalle;
  periodicidad: PeriodicidadComision;
  condiciones?: string;
  clausulaFuente: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  confianzaExtraccion: number;
  validada: boolean;
}
