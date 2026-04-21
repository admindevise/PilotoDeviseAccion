import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const conocimientoData = [
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Fórmula de honorarios fiduciarios con doble régimen de IVA y obligación tributaria cruzada",
    "contenido": "La comisión mensual de administración se calcula como `7 × SMMLV × (1 + tarifa IVA vigente)`.\n\nEste fideicomiso ha operado bajo **DOS regímenes de IVA**:\n- **(a)** IVA del 16% desde constitución hasta el 31 de diciembre de 2016 (Ley 1607 de 2012).\n- **(b)** IVA del 19% desde el 1 de enero de 2017 en adelante (Ley 1819 de 2016, Art. 184).\n\n**IMPORTANTE:** La obligación de pago de TODAS las comisiones (mensuales Y de cesión) recae sobre el operador hotelero HOTELES B3 CORP COLOMBIA (NIT 900510142), **NO** sobre los fideicomitentes individuales. Esto implica que el riesgo de crédito de la comisión está concentrado en un solo deudor.\n\n### Verificación matemática confirmada para cada año:\n- **2015:** $5,232,122 (IVA 16%)\n- **2016:** $5,598,375 (IVA 16%)\n- **2017:** $6,145,183 (IVA 19%)\n- **2024:** $10,829,000 (IVA 19%)\n- **2025:** $11,857,755 (IVA 19%)\n\nAdicionalmente, la cláusula de 'gestión adicional' (párrafo final de remuneración) permite cobrar servicios extraordinarios previo acuerdo de partes; esto fue utilizado en julio 2020 para cobrar **$35,700,000** por estructuración de cuotas extraordinarias. Los analistas deben vigilar cualquier gestión extraordinaria no facturada bajo esta cláusula residual.",
    "metadatos": {
      "origen": "Rendición Semestral Pág. 15 - Sección 20 Remuneración + Estado de Cuentas 36640 (verificación cruzada) + Estado de Cuentas 13527 (verificación histórica 2012-2014)",
      "area": "Facturación"
    },
    "fuentes": {
      "contractual": "Modificación Integral al Contrato de Fiducia Mercantil, Cláusula de Remuneración numerales 1-3",
      "normativa": "Ley 1819 de 2016 Art. 184 (cambio IVA 16% → 19%)",
      "evidencia_calculo": "Estado de Cuentas 36640 y 13527 - montos verificados para cada año 2012-2025"
    }
  },
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Sistema de doble código con migración histórica: 13527 (original) → 36640 (vigente)",
    "contenido": "El fideicomiso opera bajo DOS códigos Super que deben consultarse siempre en paralelo.\n\n1. **Código 13527:** Fue el código ORIGINAL registrado ante la Superintendencia Financiera (nombre legacy: 'FA-658 FIDEICOMISO LOTE HOTEL UNIKA B3', oficina: DIRECCIÓN GENERAL). Este código contiene el historial completo 2012-2015 de comisiones mensuales y cesiones, incluyendo la facturación bajo series FB-xxxxx y los primeros FL-xxx.\n2. **Código 36640:** Es el código VIGENTE (nombre: 'FA-658 FIDEICOMISO HOTEL B3 VIRREY', oficina: OFICINA CALLE 93). Desde 2015 absorbe las comisiones mensuales bajo series FL-xxx y luego FC70-xxxxx.\n\n**REGLA CRÍTICA:** Las cesiones de derechos pueden aparecer en CUALQUIERA de los dos códigos dependiendo de la fecha. El análisis de completitud de cobro de cesiones/pignoraciones **SIEMPRE** debe cruzar ambos Estados de Cuentas. Omitir el código 13527 resultaría en subestimar el historial de facturación y perder trazabilidad de cobros anteriores a 2015.",
    "metadatos": {
      "origen": "Estado de Cuentas 13527 (generado 06-feb-2026) + Estado de Cuentas 36640 (generado 27-nov-2025)",
      "area": "Operativa"
    },
    "fuentes": {
      "codigo_13527": "Estado de Cuentas 13527 - Registros 2012-2015, cesiones y recaudos",
      "codigo_36640": "Estado de Cuentas 36640 - Registros 2015-2025, comisiones mensuales y cesiones",
      "evidencia_migracion": "La serie de facturación cambió de FB-xxxxx (13527) → FL-xxx (transición 2014) → FC70-xxxxx (36640, 2015+)"
    }
  },
  {
    "tipo": "PRECEDENTE_CONTABLE",
    "titulo": "Mapeo de cuentas PUC por sistema: Legacy (35101002009→25011501001→13020501009) vs SIFI (51151801001→25011501001→13020501001)",
    "contenido": "El fideicomiso cambió de sistema contable en agosto 2024, y cada sistema usa un flujo de cuentas diferente para las comisiones.\n\n### SISTEMA LEGACY (ene-2020 a jul-2024)\nFlujo vía patrimonio:\n1. **Causación:** Débito `35101002009` 'COMISIÓN FIDUCIARIA' (cuenta patrimonial) / Crédito `25011501001` 'COMISIÓN POR ADMINISTRACIÓN' (pasivo).\n2. **Pago:** Débito `25011501001` / Crédito `13020501009` 'FONDO COMÚN ORDINARIO 9'.\n3. **Reconocimiento al gasto:** Débito `51151801001` 'NEGOCIOS FIDUCIARIOS' / Crédito `35101002009`.\n\nEste flujo implica que la comisión pasa PRIMERO por patrimonio y LUEGO se traslada a gasto, lo cual es una convención de contabilidad fiduciaria tipo `VIA_ANTICIPO`.\n\n### SISTEMA SIFI (ago-2024 en adelante)\nFlujo directo al gasto:\n- **Causación:** Débito `51151801001` / Crédito `25011501001`.\n- **Pago:** Débito `25011501001` / Crédito `13020501001` 'FONDO COMÚN ORDINARIO 1' (notar cambio de subcuenta 009→001).\n\n**ANOMALÍA DETECTADA:** En el auxiliar SIFI solo existe 1 causación (cesión dic-2024, $595,000). Las comisiones mensuales **NO aparecen causadas**. Los analistas deben exigir el módulo de causación automática del SIFI o verificar si las causaciones se registran en un subsistema diferente no incluido en los auxiliares estándar.",
    "metadatos": {
      "origen": "Auxiliar Contable Legacy 36640 (49,833 líneas) + Auxiliar Contable SIFI 36640 (25,233 líneas)",
      "area": "Contabilidad"
    },
    "fuentes": {
      "legacy": "AuxiliarContable36640.txt - Cuentas 35101002009, 25011501001, 51151801001, 13020501009",
      "sifi": "AuxiliarContable36640_sifi.txt - Cuentas 51151801001, 25011501001, 13020501001",
      "comprobante_referencia": "SIFI: Comprobante 493 (18-dic-2024) y 494 (19-dic-2024) - Cesión Silvia Elena Ortiz de Lloreda"
    }
  },
  {
    "tipo": "RESOLUCION_HALLAZGO",
    "titulo": "Patrón recurrente de notas crédito por reliquidación SMMLV en enero: procedimiento estándar pero sin control documental",
    "contenido": "Desde al menos 2013, el fideicomiso presenta un patrón operativo recurrente cada enero:\n\n1. La primera factura del año se emite con el SMMLV del año anterior (porque el decreto del nuevo SMMLV se publica en los últimos días de diciembre y los sistemas no se actualizan inmediatamente).\n2. Posteriormente se emite una Nota Crédito (serie NC-xxxx en código 13527 o NC2-xxxx en código 36640) que reversa la factura original.\n3. Se re-factura con el SMMLV actualizado del nuevo año.\n\n**Este patrón se verificó en:**\n- 2013 (NC-1162 reversando FB-23098)\n- 2014 (NC-1288, NC-1600)\n- 2025 (NC2-5980/6110/6111 por 3 × $11,857,755)\n\n### MITIGACIÓN OBLIGATORIA\nAunque el patrón es operativamente legítimo, las notas crédito se registran con el concepto genérico _'Nota Ajuste -'_ sin descripción del motivo. Esto genera **riesgo de auditoría**. Se debe exigir que cada NC incluya:\n- **(a)** Motivo explícito ('Reliquidación SMMLV año [X] a año [Y]')\n- **(b)** Referencia a la factura original\n- **(c)** Aprobación documentada\n\nSin esta trazabilidad, Notas Crédito de $35.5M (como las de marzo 2025) no pueden diferenciarse de ajustes irregulares.",
    "metadatos": {
      "origen": "Estado de Cuentas 13527 (NC históricas 2013-2015) + Estado de Cuentas 36640 (NC 2025) + Rendición Semestral Pág. 15",
      "area": "Facturación"
    },
    "fuentes": {
      "evidencia_2013": "Estado de Cuentas 13527 - NC-1162 (reversa FB-23098), NC-1244 (reversa FB-24584), NC-1288 (reversa FB-25150, FB-25749)",
      "evidencia_2025": "Estado de Cuentas 36640 - NC2-5980, NC2-6110, NC2-6111 (marzo 2025) y NC2-6427, NC2-6428, NC2-6429 (julio 2025)",
      "impacto_monetario": "En 2025 se emitieron NC por $71,146,530 (6 notas × $11,857,755) sin descripción detallada"
    }
  },
  {
    "tipo": "CONTEXTO_OPERATIVO",
    "titulo": "Transparencia fiscal hotelera: rentas exentas Art. 207-2 E.T. bloquean traslado de retenciones en CCP",
    "contenido": "El fideicomiso opera bajo un contrato de cuentas en participación (CCP) donde el P.A. es partícipe oculto y el operador hotelero (UNIKA Hotels Corp Colombia / HOTELES B3 CORP COLOMBIA, NIT 900510142) es socio gestor.\n\nLa Sentencia 26085 del Consejo de Estado (agosto 2024) permitió el traslado de retenciones en la fuente del socio gestor al partícipe oculto en CCP. Sin embargo, la Fiduciaria emitió concepto el 17 de marzo de 2025 determinando que esto **NO** aplica a este fideicomiso porque:\n\n- **(a)** Las rentas hoteleras son exentas al 100% conforme al Art. 207-2 del Estatuto Tributario.\n- **(b)** Conforme al Art. 369 numeral 2 E.T., los pagos o abonos en cuenta que sean exentos en cabeza del beneficiario NO son objeto de retención en la fuente.\n- **(c)** Si no existe retención practicada, no hay retención que trasladar.\n\n### IMPACTO PARA LA FIDUCIARIA\n1. No procede registrar retenciones en la contabilidad del P.A. para 2024 ni 2025 (estados financieros ya firmados).\n2. Se requiere que el socio gestor certifique mensualmente (con firma de revisor fiscal) la discriminación entre ingresos por rentas exentas hoteleras e ingresos gravados con renta ordinaria.\n3. Si el operador insiste en el traslado, se generaría una gestión administrativa adicional susceptible de cobro como 'gestión extraordinaria' bajo la cláusula residual de remuneración.\n4. A la fecha de la rendición (julio 2025), el operador NO ha respondido al pronunciamiento de la Fiduciaria, pendiente autorización del comité de beneficiarios.",
    "metadatos": {
      "origen": "Rendición Semestral Ene-Jun 2025 Págs. 7-9, Secciones 9 y 11",
      "area": "Legal"
    },
    "fuentes": {
      "sentencia": "Sentencia 26085 Consejo de Estado, agosto 2024 - Traslado retenciones en CCP",
      "normativa": "Art. 102 E.T. (transparencia fiscal), Art. 207-2 E.T. (rentas exentas hoteleras), Art. 369 numeral 2 E.T. (no retención sobre exentas)",
      "pronunciamiento_fiduciaria": "Concepto ACCION Fiduciaria del 17 de marzo de 2025 dirigido al operador hotelero",
      "estado": "Pendiente respuesta del operador hotelero y autorización del comité de beneficiarios"
    }
  }
];

async function main() {
  const fid = await prisma.fideicomiso.findFirst({
    where: { codigoPrincipal: 'FA-658' },
  });

  if (!fid) {
    console.log('Fideicomiso FA-658 no encontrado');
    return;
  }

  // Borrar los anteriores si existen
  await prisma.entradaConocimiento.deleteMany({
    where: { fideicomisoId: fid.id }
  });

  const mappedData = conocimientoData.map(item => ({
    ...item,
    fideicomisoId: fid.id,
    tipo: item.tipo as any,
    metadatos: item.metadatos as any,
    fuentes: item.fuentes as any
  }));

  const inserted = await prisma.entradaConocimiento.createMany({
    data: mappedData
  });

  console.log(`Inyectadas exitosamente ${inserted.count} entradas FORMATEADAS CON MARKDOWN para Hotel B3 Virrey (FA-658).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
