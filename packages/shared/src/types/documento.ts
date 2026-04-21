export enum TipoDocumento {
  CONTRATO_FIDUCIA = 'CONTRATO_FIDUCIA',
  OTROSI_FIDUCIA = 'OTROSI_FIDUCIA',
  AUXILIAR_CONTABLE = 'AUXILIAR_CONTABLE',
  ESTADO_CUENTA_COMISIONES = 'ESTADO_CUENTA_COMISIONES',
  RENDICION_SEMESTRAL = 'RENDICION_SEMESTRAL',
  CESION_DERECHOS = 'CESION_DERECHOS',
  CORREO_ELECTRONICO = 'CORREO_ELECTRONICO',
  CONTRATO_PARALELO = 'CONTRATO_PARALELO',
  OTROSI_PARALELO = 'OTROSI_PARALELO',
  ACTA_COMITE = 'ACTA_COMITE',
  INSTRUCCION_PAGO = 'INSTRUCCION_PAGO',
  OTRO = 'OTRO',
}

export enum FormatoOriginal {
  PDF = 'PDF',
  PDF_ZIP = 'PDF_ZIP',
  MSG = 'MSG',
  EML = 'EML',
  XLSX = 'XLSX',
  XLS = 'XLS',
  TSV = 'TSV',
  CSV = 'CSV',
  DOCX = 'DOCX',
}

export interface DocumentoFideicomiso {
  id: string;
  fideicomisoId: string;
  tipo: TipoDocumento;
  formatoOriginal: FormatoOriginal;
  nombreArchivo: string;
  fechaCarga: string;
  fechaDocumento?: string;
  contextoUsuario?: string;
  procesado: boolean;
  clasificacion?: {
    confidence: number;
    method: string;
    keywords: string[];
  };
}
