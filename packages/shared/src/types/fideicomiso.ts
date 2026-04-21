export enum TipologiaFideicomiso {
  FA = 'FA',
  MR = 'MR',
  MG = 'MG',
}

export enum EstadoFideicomiso {
  ACTIVO = 'ACTIVO',
  TERMINADO = 'TERMINADO',
  LIQUIDACION = 'LIQUIDACION',
}

export interface Fideicomiso {
  id: string;
  codigoPrincipal: string;
  nombre: string;
  fiduciariaAdmin: string;
  fechaConstitucion: string;
  tipologia: TipologiaFideicomiso;
  estado: EstadoFideicomiso;
  descripcion?: string;
}

export interface CodigoFideicomiso {
  id: string;
  fideicomisoId: string;
  codigo: string;
  tipo: 'PRINCIPAL' | 'ALIAS';
  vigenciaDesde: string;
  vigenciaHasta?: string;
  motivoCambio?: string;
}

export interface Fideicomitente {
  id: string;
  fideicomisoId: string;
  nombre: string;
  nit: string;
  tipo: 'FIDEICOMITENTE' | 'BENEFICIARIO' | 'CESIONARIO';
  vigenciaDesde: string;
  vigenciaHasta?: string;
}
