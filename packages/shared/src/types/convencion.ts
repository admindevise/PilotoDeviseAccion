export enum TipoConvencion {
  CONTABLE = 'CONTABLE',
  COMERCIAL = 'COMERCIAL',
  OPERATIVA = 'OPERATIVA',
  REGISTRO = 'REGISTRO',
  REGULATORIA = 'REGULATORIA',
}

export enum FlujoContable {
  DIRECTO = 'DIRECTO',
  VIA_ANTICIPO = 'VIA_ANTICIPO',
  EXTERNO = 'EXTERNO',
}

export interface ConvencionFideicomiso {
  id: string;
  fideicomisoId: string;
  tipo: TipoConvencion;
  nombre: string;
  descripcion: string;
  parametros?: {
    cuentaComision?: string;
    cuentaAnticipo?: string;
    flujoContable?: FlujoContable;
    [key: string]: any;
  };
  vigenciaDesde: string;
  vigenciaHasta?: string;
  fuenteDocumental?: string;
}
