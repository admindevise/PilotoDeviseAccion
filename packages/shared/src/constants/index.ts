export const API_VERSION = 'v1';

export const CUENTAS_COMISION = {
  GASTO: '51151801001',
  COSTO: '15203001001',
  ANTICIPO: '16320001001',
} as const;

export const VARIABLES_MACRO_DEFAULTS = {
  SMMLV: {
    2023: 1160000,
    2024: 1300000,
    2025: 1423500,
  },
  IVA: {
    default: 0.19,
  },
} as const;
