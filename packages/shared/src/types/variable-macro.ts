export enum PeriodicidadVariable {
  ANUAL = 'ANUAL',
  MENSUAL = 'MENSUAL',
  DIARIA = 'DIARIA',
}

export interface VariableMacroeconomica {
  id: string;
  codigo: string;
  nombre: string;
  periodicidad: PeriodicidadVariable;
  unidad: string;
  fuenteOficial: string;
}

export interface ValorHistorico {
  id: string;
  variableId: string;
  valor: number;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  normaLegal?: string;
}
