export enum EstadoResultado {
  CONCILIADO = 'CONCILIADO',
  DISCREPANCIA = 'DISCREPANCIA',
  NO_ENCONTRADO = 'NO_ENCONTRADO',
  NO_FACTURADO = 'NO_FACTURADO',
  OPORTUNIDAD_REVENUE = 'OPORTUNIDAD_REVENUE',
  ANOMALIA = 'ANOMALIA',
}

export interface ResultadoConciliacion {
  id: string;
  conciliacionId: string;
  reglaComisionId?: string;
  periodo: string;
  estado: EstadoResultado;
  montoEsperado?: number;
  montoRegistrado?: number;
  discrepancia?: number;
  confianza: number;
  evidencia: EvidenciaConciliacion;
  razonamiento?: string;
  variableMacro?: {
    codigo: string;
    valor: number;
    anio: number;
  };
}

export interface EvidenciaConciliacion {
  fuenteRegla?: string;
  fuenteContable?: string;
  lineaAuxiliar?: number;
  numeroFactura?: string;
  cuentaContable?: string;
}
