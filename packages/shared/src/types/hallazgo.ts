export enum TipoHallazgo {
  COMISION_NO_FACTURADA = 'COMISION_NO_FACTURADA',
  COMISION_NO_RECAUDADA = 'COMISION_NO_RECAUDADA',
  DISCREPANCIA_MONTO = 'DISCREPANCIA_MONTO',
  INCONSISTENCIA_FUENTES = 'INCONSISTENCIA_FUENTES',
  PAGO_PARCIAL_INCOMPLETO = 'PAGO_PARCIAL_INCOMPLETO',
  GAP_TEMPORAL = 'GAP_TEMPORAL',
  CESION_INCONSISTENTE = 'CESION_INCONSISTENTE',
  ANOMALIA_CONTABLE = 'ANOMALIA_CONTABLE',
  OPORTUNIDAD_REVENUE = 'OPORTUNIDAD_REVENUE',
  INFORMATIVO = 'INFORMATIVO',
}

export enum SeveridadHallazgo {
  CRITICO = 'CRITICO',
  ALTO = 'ALTO',
  MEDIO = 'MEDIO',
  BAJO = 'BAJO',
  INFORMATIVO = 'INFORMATIVO',
}

export enum CategoriaHallazgo {
  CONCILIACION = 'CONCILIACION',
  REVENUE = 'REVENUE',
  ANOMALIA = 'ANOMALIA',
  CONSISTENCIA = 'CONSISTENCIA',
}

export enum EstadoHallazgo {
  ABIERTO = 'ABIERTO',
  EN_GESTION = 'EN_GESTION',
  RESUELTO = 'RESUELTO',
  DESCARTADO = 'DESCARTADO',
  EXCEPCION = 'EXCEPCION',
}

export enum TipoResolucion {
  DESCARTADO = 'DESCARTADO',
  RESUELTO_CON_EXPLICACION = 'RESUELTO_CON_EXPLICACION',
  RESUELTO_CON_ADJUNTOS = 'RESUELTO_CON_ADJUNTOS',
  GESTION_EXTERNA = 'GESTION_EXTERNA',
  ESCALADO = 'ESCALADO',
  EXCEPCION_ACEPTADA = 'EXCEPCION_ACEPTADA',
}

export interface FuenteHallazgo {
  documento: string;
  tipo: string;
  ubicacion: string;
  datosExtraidos: any;
  urlNavegacion?: string;
}

export interface Hallazgo {
  id: string;
  fideicomisoId: string;
  tipo: TipoHallazgo;
  severidad: SeveridadHallazgo;
  categoria: CategoriaHallazgo;
  titulo: string;
  descripcion: string;
  razonamiento: string;
  fuentes: FuenteHallazgo[];
  reglaAplicada?: {
    version: string;
    clausula: string;
    formula: string;
  };
  variableMacro?: {
    codigo: string;
    valor: number;
    anio: number;
  };
  impactoEconomico?: number;
  estado: EstadoHallazgo;
}
