import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const conocimientoData = [
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Cláusula de comisión punitiva por incumplimiento del servicio de la deuda: 10 SMLMV mensuales adicionales",
    "contenido": "El Otrosí Integral (Cláusula Vigésimo Sexta, numeral 3.1) introduce una **comisión punitiva de alto impacto**:\n\nAl primer requerimiento o notificación de incumplimiento por parte de LAAD AMERICAS NV (Acreedor Vinculado) en la atención del SERVICIO DE LA DEUDA, la fiduciaria tiene derecho a cobrar **10 SMLMV mensuales ADICIONALES** a la comisión ordinaria de 2 SMLMV, sin perjuicio de esta última. Esta comisión se mantiene vigente hasta que se subsane el incumplimiento.\n\nA valores 2025 (SMLMV $1,423,500), esto representa **$14,235,000 + IVA = $16,939,650 COP mensuales ADICIONALES**.\nCombinada con la comisión ordinaria, el cargo mensual total en caso de incumplimiento asciende a 12 SMLMV ($17,082,000 + IVA = $20,327,580 COP).\n\nEsta cláusula constituye un disparador de sobrecostos significativo que debe monitorearse activamente.\n\n### IMPLICACIONES\n- El analista debe verificar mensualmente si LAAD AMERICAS NV ha emitido algún requerimiento de incumplimiento para activar la facturación correspondiente.\n- La ausencia de facturación de esta comisión tras un evento de incumplimiento constituiría una **fuga de revenue CRÍTICA**.\n- Dado que el crédito externo es de USD 200,000, cualquier variación cambiaria adversa que dificulte el servicio de la deuda podría activar esta cláusula.",
    "metadatos": {
      "origen": "Otrosí Integral 202511112400038165 - Cláusula Vigésimo Sexta, numeral 3.1",
      "area": "Facturación"
    },
    "fuentes": {
      "contrato": "OTROSI_202511112400038165.pdf",
      "clausula": "Vigésimo Sexta, 3.1",
      "impactoMensualMaximo": 20327580,
      "moneda": "COP"
    }
  },
  {
    "tipo": "RESOLUCION_HALLAZGO",
    "titulo": "Precedente de facturación retroactiva masiva: gap de 47 meses mitigado con intereses de mora",
    "contenido": "Entre marzo 2021 y enero 2025 (47 meses) **NO se emitieron facturas individuales de comisión mensual** para este fideicomiso. Las facturas previamente emitidas para marzo y abril 2021 (FC20-62189 y FC20-62190) fueron ANULADAS mediante notas crédito NC2-6008 y NC2-6009.\n\nLa totalidad del período se consolidó en una única **factura masiva FC70-53857 por $92,871,338 COP** (base $78,042,301 + IVA $14,829,037), emitida el 31-ene-2025. Los intereses de mora se facturaron por separado en FC70-53806 por **$6,459,328 COP** ($5,427,166 + IVA $1,032,162).\nAmbas fueron recaudadas el mismo 31-ene-2025 vía Banco Occidente ACH (refs. RCJ-381082 y RCJ-381081).\n\n### ANÁLISIS DEL PRECEDENTE\n1. El fideicomitente ALTOS DEL TIO CONEJO S.A.S. tiene un patrón recurrente de acumulación de deuda (también ocurrió en ago-2021 con 4 facturas y en ene-2022 con 8 facturas).\n2. La fiduciaria aceptó consolidar la deuda en una sola factura sin descuento o condonación.\n3. Los intereses de mora **SÍ se cobraron**, lo que valida el derecho contractual.\n4. El riesgo de crédito de este fideicomitente es **ALTO**.\n\n### PROCEDIMIENTO DE MITIGACIÓN OBLIGATORIO\nImplementar facturación mensual automatizada y activar el **descuento automático de comisiones** desde los recursos del fideicomiso (autorizado por Parágrafo Segundo, Cláusula Vigésimo Sexta del Otrosí Integral).",
    "metadatos": {
      "origen": "ESTADO_CUENTAS_80240.xlsx - Análisis cruzado de facturas, notas crédito y recaudos",
      "area": "Facturación"
    },
    "fuentes": {
      "facturaConsolidada": "FC70-53857",
      "facturaMora": "FC70-53806",
      "recaudos": [
        "RCJ-381082",
        "RCJ-381081"
      ],
      "notasCredito": [
        "NC2-6008",
        "NC2-6009"
      ],
      "montoConsolidado": 99330666,
      "periodoAfectado": "2021-03 a 2025-01"
    }
  },
  {
    "tipo": "PRECEDENTE_CONTABLE",
    "titulo": "Mapeo de cuentas PUC y flujo contable dual: Legacy (2018-2024) vs SIFI (2024-presente)",
    "contenido": "El fideicomiso opera con un mapeo contable específico que varía según el ERP y período.\n\n### ERP LEGACY (oct-2018 a ago-2024)\nLa causación de la comisión fiduciaria se registra con:\n- **DÉBITO:** cuenta 35101002009 (COMISION FIDUCIARIA)\n- **CRÉDITO:** cuenta 25011501001 (COMISION POR ADMINISTRACION)\n\nEl pago se ejecuta desde la cuenta `13020501001` (FONDO COMUN ORDINARIO) mediante tipo de comprobante 906 (Egreso sin Cheque). Tercero NIT: 800155413 (ACCION SOCIEDAD FIDUCIARIA S.A.). El flujo es DIRECTO al gasto sin paso por anticipo.\n\n### ERP SIFI (desde ago-2024)\nEn la migración de agosto 2024, se ejecutó un cargue de saldos iniciales con comprobante 906-1444, arrojando un saldo de comisión de **$9,664,905** en cuenta `35101002009`. Desde la migración, **NO se observan** nuevos movimientos de causación de comisión en el fideicomiso; la comisión se factura y recauda a nivel CORPORATIVO (externo al patrimonio autónomo).\n\n### CÓDIGO 127817 (desde nov-2025)\nEl nuevo código solo registra movimientos de transferencia de bienes inmuebles. Cuentas utilizadas: `16050101002` (APORTES EN ESPECIE), `16100501010` / `16100501001` (EDIFICACIONES).\n**NO** se ha establecido aún la causación contable de la comisión, lo cual es una anomalía pendiente de resolución.\n\n### INSTRUCCIÓN\nPara verificaciones futuras de causación, buscar movimientos en cuenta `35101002009` con tercero NIT 800155413. Si no existen, confirmar que la comisión se esté causando a nivel corporativo y no en el patrimonio autónomo.",
    "metadatos": {
      "origen": "AuxiliarContable80240.txt, AuxiliarContable80240_Sifi.txt, AuxiliarContable127817.txt, AuxiliarContable127817_sifi.txt",
      "area": "Contabilidad"
    },
    "fuentes": {
      "cuentaComision": "35101002009",
      "cuentaContrapartida": "25011501001",
      "cuentaPago": "13020501001",
      "nitFiduciaria": "800155413",
      "saldoMigrado": 9664905,
      "fechaMigracion": "2024-08-31"
    }
  },
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Prelación de pagos y descuento irrevocable de comisiones desde recursos del fideicomiso",
    "contenido": "El Otrosí Integral establece una arquitectura de prioridad de pagos que el controlador fiduciario **DEBE conocer** para evitar conflictos con el acreedor vinculado y para proteger el revenue de la fiduciaria.\n\n- **REGLA 1 - Descuento irrevocable (Cláusula Vigésimo Sexta, Parágrafo Segundo):** El fideicomitente autorizó IRREVOCABLEMENTE a la fiduciaria para descontar comisiones directamente de los recursos del fideicomiso. Si no hay recursos, el fideicomitente debe asumir el pago de inmediato. En caso de mora, se cobran intereses a la tasa máxima legal vigente.\n- **REGLA 2 - Derecho de abstención (Parágrafo Octavo):** La fiduciaria PUEDE abstenerse de realizar CUALQUIER gestión si existe mora en comisiones o costos. Esto incluye giros al exterior para servicio de la deuda con LAAD AMERICAS NV.\n- **REGLA 3 - Mecanismo ejecutivo (Cláusula Vigésimo Octava, Parágrafo Tercero):** La certificación del Representante Legal + Contador de la fiduciaria sobre sumas adeudadas PRESTA MÉRITO EJECUTIVO, habilitando cobro judicial sin necesidad de proceso ordinario.\n- **REGLA 4 - Gastos Adicionales:** La comisión no incluye costos de ejecución. Gastos bancarios, impuestos, honorarios de abogados, seguros, multas y revisoría fiscal son ADICIONALES a la comisión y también descontables del fideicomiso.\n\n### IMPLICACIÓN OPERATIVA\nActualmente hay **$24,483,360 COP en facturas pendientes** (5 en código 80240 + 2 en código 127817).\n\nLa fiduciaria tiene la potestad contractual de:\n1. Descontar este monto de los recursos del fideicomiso.\n2. Abstenerse de realizar giros al exterior hasta recibir pago.\n3. Iniciar acción ejecutiva con solo una certificación contable.",
    "metadatos": {
      "origen": "Otrosí Integral 202511112400038165 - Cláusulas Vigésimo Sexta (Parágrafos 2, 3, 8) y Vigésimo Octava (Parágrafo 3)",
      "area": "Legal"
    },
    "fuentes": {
      "contrato": "OTROSI_202511112400038165.pdf",
      "clausulas": [
        "Vigésimo Sexta Pará. 2",
        "Vigésimo Sexta Pará. 8",
        "Vigésimo Octava Pará. 3"
      ],
      "deudaPendienteActual": 24483360,
      "moneda": "COP"
    }
  },
  {
    "tipo": "CONTEXTO_OPERATIVO",
    "titulo": "Protocolo de transición de código SuperFinanciera: riesgo de doble facturación en migración FG→FA",
    "contenido": "En noviembre 2025, el fideicomiso transitó del código SuperFinanciera 80240 (tipología FG-447, Garantía) al código 127817 (tipología FA-6593, Administración y Pagos) tras la suscripción del Otrosí Integral.\n\nEsta transición generó un **HALLAZGO ACTIVO de doble facturación**:\n1. El 06-nov-2025 se emitió FC70-63138 por **$2,540,948** (1.5 SMLV) bajo código 80240 para noviembre-2025.\n2. El 24-nov-2025 se emitió FC70-63568 por **$2,258,620** (2 SMLV) bajo código 127817 para el MISMO período noviembre-2025.\n\nEl total cobrado es $4,799,568 por un solo mes; **la factura válida es FC70-63568 del nuevo código**. La factura FC70-63138 requiere anulación o nota crédito.\n\nAdicionalmente, se detectó una discrepancia en el monto de la nueva comisión: $2,258,620 (facturado) vs $3,387,930 (calculado como 2×$1,423,500×1.19). La diferencia de -$1,129,310 podría deberse a un prorrateo por días (firma el 7-nov = 24 días del mes), pero ningún cálculo proporcional razonable da exacto.\n\n### PROTOCOLO PARA FUTURAS MIGRACIONES\n- **(a)** Al activar un nuevo código, SIEMPRE verificar y anular facturas pendientes del código anterior que cubran períodos ya facturados en el nuevo.\n- **(b)** Documentar formalmente el criterio de prorrateo cuando una comisión mensual no cubre el mes completo.\n- **(c)** Cerrar contablemente el código anterior con conciliación final antes de emitir facturas en el nuevo código.",
    "metadatos": {
      "origen": "ESTADO_CUENTAS_80240.xlsx, ESTADO_CUENTAS_127817.xlsx, OTROSI_202511112400038165.pdf - Análisis cruzado",
      "area": "Operativa"
    },
    "fuentes": {
      "facturaAnular": "FC70-63138",
      "facturaValida": "FC70-63568",
      "codigoAnterior": "80240",
      "codigoNuevo": "127817",
      "discrepanciaMonto": -1129310,
      "fechaTransicion": "2025-11-24"
    }
  }
];

async function main() {
  const fid = await prisma.fideicomiso.findFirst({
    where: { codigoPrincipal: 'FA-6593' },
  });

  if (!fid) {
    console.log('Fideicomiso FA-6593 no encontrado');
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

  console.log(`Inyectadas exitosamente ${inserted.count} entradas FORMATEADAS CON MARKDOWN para Altos del Tio Conejo (FA-6593).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
