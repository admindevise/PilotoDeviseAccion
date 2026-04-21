import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const conocimientoData = [
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Fórmula de comisión fiduciaria: MAX(0.8% pagos a beneficiarios, 3 SMLMV) + IVA 19%",
    "contenido": "La Cláusula Décima Sexta, numeral 16.5 del Contrato de Fiducia Mercantil FA-2594 establece una **comisión fiduciaria mensual con estructura dual**:\n\n- (a) **Componente variable:** 0.8% sobre el valor total de los pagos realizados a los Beneficiarios del Fideicomiso en cada período.\n- (b) **Piso mínimo:** TRES (3) Salarios Mínimos Mensuales Legales Vigentes (SMMLV).\n\n**Lo que resulte MAYOR.**\n\nEsta fórmula implica que incluso en meses donde el 0.8% de los pagos sea inferior a 3 SMMLV, la fiduciaria tiene derecho irrenunciable al cobro del mínimo. Para 2025 esto equivale a `3 × $1,423,500 = $4,270,500 + IVA 19% = $5,081,895/mes`.\n\nEl Parágrafo Segundo de la misma cláusula establece que la comisión se grava con IVA a la tarifa general.\n\n### OBLIGACIÓN TRIBUTARIA CRUZADA\nEl IVA es a cargo del obligado al pago de la remuneración (los Beneficiarios), no del fideicomiso como patrimonio autónomo. Esto genera una obligación tributaria directa sobre los beneficiarios individuales propietarios de las suites hoteleras.\n\n### ALERTA CRÍTICA\nDesde **julio 2017**, la facturación observada aplica únicamente **1 SMMLV/mes** (67% menos que lo contractual). La Rendición H1-2025 (pág. 6, Sección 14) transcribe textualmente la fórmula de 3 SMMLV como tarifa VIGENTE, confirmando que no existe otrosí modificatorio.\n\n**Diferencial acumulado estimado:** $243.6M COP.",
    "metadatos": {
      "origen": "Contrato FA-2594, Cláusula Décima Sexta, numerales 16.5 y Parágrafos 1° y 2° (extraído por visión pág. 27) + Rendición H1-2025 pág. 6 Sección 14",
      "area": "Facturación"
    },
    "fuentes": {
      "contractual": "Contrato de Fiducia Mercantil FA-2594, Cl. 16.5, firmado 17/02/2014",
      "confirmatoria": "Rendición de Cuentas H1-2025, Sección 14 'Remuneración de la Fiduciaria', pág. 6, firmada 16/07/2025 por Edward Alfonso González González (Rep. Legal)",
      "normativa_tributaria": "Ley 1819 de 2016 Art. 184 (IVA 16% → 19%)",
      "estado_cuentas": "Estado de Cuentas 44764, 163 facturas analizadas (jul 2014 - nov 2025)"
    }
  },
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Cascada de cobro contractual: descuento directo → factura 5 días → mora a tasa máxima legal",
    "contenido": "El contrato establece un mecanismo de cobro escalonado con tres niveles de ejecución que la fiduciaria **DEBE** activar secuencialmente:\n\n1. **NIVEL 1 - DESCUENTO DIRECTO:** El Fideicomitente y los Beneficiarios autorizan *'expresa e irrevocablemente'* a la Fiduciaria para descontar de los recursos del PATRIMONIO AUTÓNOMO la remuneración a que tiene derecho (Cl. 16, párrafo posterior al numeral 16.6). Este derecho opera desde el inicio hasta la liquidación del contrato.\n\n2. **NIVEL 2 - FACTURACIÓN EXTERNA:** *'En caso de que no existan en el patrimonio autónomo dineros suficientes para el pago de la remuneración, la Fiduciaria remitirá las respectivas facturas que deberán cancelarse dentro de los CINCO (5) días corrientes siguientes a la fecha del recibo de las mismas'* (Cl. 16, párrafo final).\n\n3. **NIVEL 3 - INTERESES DE MORA:** *'En caso contrario [incumplimiento del pago], se causarán y pagarán intereses de mora liquidados a la tasa máxima legal vigente desde el día del vencimiento y hasta la fecha en la cual se registre el pago'* (Cl. 16, Parágrafo Primero).\n\nLa Cl. Décima Quinta refuerza: *'intereses de mora a la razón de la tasa comercial de mora más alta que permita la ley, sin perjuicio de las sanciones a que haya lugar'*.\n\n### IMPLICACIÓN OPERATIVA\nCon 69 facturas vencidas desde marzo 2020 y un patrimonio con $0 de disponible, la fiduciaria debió activar el Nivel 2 (facturación directa a beneficiarios) y el Nivel 3 (liquidación de intereses de mora). No se evidencia gestión de cobro de intereses en ninguna fuente analizada.\n\nEl derecho de remuneración subsiste **HASTA LA LIQUIDACIÓN** del contrato (Cl. 16 Par. 1° in fine).",
    "metadatos": {
      "origen": "Contrato FA-2594, Cláusula Décima Sexta (párrafos finales y Parágrafo 1°) + Cláusula Décima Quinta (Gastos y Costos). Extraído por visión págs. 25 y 27.",
      "area": "Facturación"
    },
    "fuentes": {
      "nivel_1": "Contrato FA-2594, Cl. 16 párrafo post-numeral 16.6 (pág. 27 visión)",
      "nivel_2": "Contrato FA-2594, Cl. 16 párrafo siguiente (pág. 27 visión)",
      "nivel_3_a": "Contrato FA-2594, Cl. 16 Parágrafo Primero (pág. 27 visión)",
      "nivel_3_b": "Contrato FA-2594, Cl. Décima Quinta - Gastos y Costos (pág. 25 visión)",
      "subsistencia": "Contrato FA-2594, Cl. 16 Parágrafo Primero in fine: 'El derecho de remuneración subsiste para LA FIDUCIARIA hasta la liquidación del presente contrato'"
    }
  },
  {
    "tipo": "RESOLUCION_HALLAZGO",
    "titulo": "Subfacturación sistémica 3→1 SMLMV sin otrosí: procedimiento de mitigación obligatorio",
    "contenido": "**HALLAZGO:** Desde julio 2017, la fiduciaria factura 1 SMMLV/mes en lugar de los 3 SMMLV contractuales, sin que exista otrosí, acta de Comité de Beneficiarios, ni acuerdo comercial documentado que autorice la reducción. La Rendición H1-2025 (documento oficial firmado ante SFC) transcribe la tarifa original de 3 SMMLV como vigente, lo que descarta la existencia de modificación contractual no proporcionada.\n\nSe identifican además dos períodos transicionales:\n1. ene-2016 a jun-2017 facturado a 2.5 SMMLV sin soporte;\n2. jul-2017 a la fecha facturado a 1 SMMLV sin soporte.\n\n**IMPACTO ACUMULADO:** $243.6M COP (101 meses a 1 SMMLV) + $4.8M (12 meses a 2.5 SMMLV en 2016).\n\n### PROCEDIMIENTO DE MITIGACIÓN OBLIGATORIO\n\n- **(1) VERIFICACIÓN JURÍDICA:** Solicitar al área Legal certificación formal de inexistencia de otrosíes para FA-2594. Consultar repositorio de Secretaría General y archivo físico de la Oficina Calle 93.\n- **(2) CONSULTA INTERNA:** Solicitar al área Comercial/VP de Negocios la explicación del descuento tarifario. Verificar si existe acuerdo verbal o correo electrónico que documente la decisión.\n- **(3) ESCALAMIENTO:** Si se confirma inexistencia de soporte, escalar a Vicepresidencia Jurídica y Revisoría Fiscal como incumplimiento de la Circular Básica Jurídica (SFC) y posible detrimento patrimonial de la fiduciaria.\n- **(4) RECUPERACIÓN:** Evaluar viabilidad de facturación retroactiva del diferencial con conceptuación jurídica sobre prescripción (5 años para obligaciones comerciales en Colombia, Art. 789 C.Co.). Las facturas de jul-2017 a feb-2021 (~43 meses) podrían estar en riesgo de prescripción si no se interrumpió.\n- **(5) NORMALIZACIÓN:** Independientemente de la recuperación histórica, corregir inmediatamente la tarifa mensual vigente a 3 SMMLV + IVA = $5,081,895/mes (2025).",
    "metadatos": {
      "origen": "Cruce: Contrato FA-2594 Cl. 16.5 (visión pág. 27) vs Estado de Cuentas 44764 (163 facturas) vs Rendición H1-2025 pág. 6 vs Auxiliares Contables Legacy y SIFI",
      "area": "Legal"
    },
    "fuentes": {
      "contrato": "Cl. 16.5: 'mínimo mensual de tres salarios mínimos mensuales legales vigentes (3SMMLV)'",
      "rendicion": "Rendición H1-2025 pág. 6: transcripción íntegra de Cl. 16 con tarifa 3 SMMLV + facturas listadas a $1,693,965 (=1 SMMLV×1.19)",
      "estado_cuentas": "163 facturas: FL-1868 a FL-3783 (2.5 SMMLV, 2016-H1 2017), FL-3784 en adelante (1 SMMLV, jul 2017+)",
      "prescripcion": "Art. 789 Código de Comercio de Colombia: prescripción ordinaria de 5 años para acciones derivadas del contrato mercantil"
    }
  },
  {
    "tipo": "PRECEDENTE_CONTABLE",
    "titulo": "Mapeo de cuentas PUC y flujo contable de comisión fiduciaria (Legacy → SIFI)",
    "contenido": "### FLUJO CONTABLE DE COMISIÓN EN SISTEMA LEGACY (sep 2020 - ago 2024)\nLa causación y pago de la comisión fiduciaria sigue un flujo DIRECTO al gasto sin pasar por anticipo:\n\n- **(a) CAUSACIÓN:** Débito `51151801001` *NEGOCIOS FIDUCIARIOS* (gasto de comisión) / Crédito `25011501001` *COMISION POR ADMINISTRACION* (pasivo - provisión de comisión por pagar).\n- **(b) PAGO:** Débito `25011501001` / Crédito `13020501005` *FONDO COMUN ORDINARIO 5* (activo - cuenta bancaria).\n\nSe observa cargo adicional de $4,500 en Cta `51151201001` *SERVICIOS BANCARIOS* por tarifa transaccional por cada pago efectuado.\n\n### MIGRACIÓN A SIFI (ago 2024+)\nEl 31/08/2024 se ejecutó cargue de saldos iniciales al nuevo sistema SIFI (Comprobante tipo 906 - NOTAS CONTABLES). Saldos migrados relevantes:\n- **Cta 51151801001 (Negocios Fiduciarios):** $1,796,916 [Db, NIT 800155413 ACCION FIDUCIARIA]\n- **Cta 25909501009 (Operación Hotelera):** $120,264,119 [Cr, NIT 900399903 SOC. OPERADORA URBAN ROYAL]\n- **Cta 35050501001 (Aportes en Dinero):** $455,059,411 [Cr, NIT 805012921 PATRIMONIOS AUTONOMOS]\n- **Cta 35100501001 (Restitución de Aportes):** $438,890,127 [Db]\n\n**Post-migración:** SIFI solo registra movimientos diarios de CIERRE FONDO INVERSION (tipo 914). **CERO registros** de comisión fiduciaria post-migración, confirmando que no se ha causado ni pagado comisión desde la migración.\n\n### ANOMALÍA DETECTADA\nEn el auxiliar Legacy existe un pago de $1,783,182 el 03/04/2024 (comprobante tipo 800155413) referenciando `CR-83887`, pero en el Estado de Cuentas esta factura aparece como impaga. El monto del pago excede el valor de la factura ($1,044,586) en $738,596. Posible aplicación cruzada de pagos a múltiples facturas no correctamente imputada.",
    "metadatos": {
      "origen": "AuxiliarContable44764.txt (Legacy, 965 líneas, sep 2020 - ago 2024) + AuxiliarContable44764_sifi.txt (SIFI, 1,402 líneas, ago 2024+)",
      "area": "Contabilidad"
    },
    "fuentes": {
      "legacy_gasto": "AuxiliarContable44764.txt: Cta 51151801001 (NEGOCIOS FIDUCIARIOS)",
      "legacy_provision": "AuxiliarContable44764.txt: Cta 25011501001 (COMISION POR ADMINISTRACION)",
      "legacy_banco": "AuxiliarContable44764.txt: Cta 13020501005 (FONDO COMUN ORDINARIO 5)",
      "sifi_migracion": "AuxiliarContable44764_sifi.txt: Comprobante tipo 906, NOTAS CONTABLES, 31/08/2024",
      "sifi_valoracion": "AuxiliarContable44764_sifi.txt: Comprobantes tipo 914, CIERRE FONDO INVERSION (diarios)",
      "anomalia": "Cruce Legacy (pago 03/04/2024 $1,783,182) vs Estado de Cuentas (CR-83887 impaga $1,044,586)"
    }
  },
  {
    "tipo": "CONTEXTO_OPERATIVO",
    "titulo": "Estructura tripartita, insolvencia del PA y obligación de cobro a beneficiarios individuales",
    "contenido": "### ESTRUCTURA DEL NEGOCIO FIDUCIARIO\nEl fideicomiso FA-2594 opera bajo una estructura tripartita donde la fiduciaria (ACCION) actúa como vocera del patrimonio autónomo que administra las 118 suites del Hotel Urban Royal Calle 26 (Edificio Takay Prisma, Conjunto Mirador de Takay).\n\nLos tres actores son:\n1. **FIDEICOMITENTE:** Construcciones Futura 2000 S.A. (NIT 800200571) - promotor original que pierde calidad a medida que transfiere las unidades privadas.\n2. **BENEFICIARIOS:** 11 personas naturales/jurídicas propietarios de las suites, quienes ceden el usufructo al fideicomiso. Conforman la Asamblea y el Comité de Beneficiarios.\n3. **OPERADOR HOTELERO:** Sociedad Operadora Urban Royal Calle 26 SAS (NIT 900399903) - gestiona la operación diaria del hotel mediante Contrato de Cuentas en Participación (CCP).\n\n### INSOLVENCIA DEL PATRIMONIO AUTÓNOMO (al 30/06/2025)\n- **Activo total:** $192,696 (solo inversiones en carteras colectivas ACCION).\n- **Pasivo:** $120,264,119 (100% adeudado al Operador Hotelero por operación hotelera).\n- **Patrimonio:** NEGATIVO -$120,071,423.\n- **Pérdidas acumuladas:** $136,247,078.\n- **Disponible para pago de comisiones:** $0.00 (confirmado en Rendición pág. 4).\n\n### CONSECUENCIA OPERATIVA PARA FACTURACIÓN\nDado que el Nivel 1 de cobro (descuento del PA) es imposible por insolvencia, la Cl. 16 **OBLIGA a activar el Nivel 2: facturación DIRECTA a los Beneficiarios individuales**, quienes responden *'en proporción a su participación'*.\n\nLa Cl. 10.6 prevé intereses de mora a tasa máxima legal por retraso en pagos de cuotas. La Asamblea de Beneficiarios puede *'decretar el pago de cuotas a cargo de LOS BENEFICIARIOS'* (Cl. 12.2.3) con mayoría simple. Este mecanismo no se ha activado según la documentación analizada.\n\n**DATO CRÍTICO:** La Rendición H1-2025 reporta CERO movimientos de ingresos y egresos en el semestre. El fideicomiso genera únicamente $6,758/semestre en rendimientos financieros, insuficiente para cubrir siquiera el 0.1% de una mensualidad de comisión.",
    "metadatos": {
      "origen": "Contrato FA-2594 (Cl. 1, 10, 12, 13, 16, Décima Quinta) + Rendición H1-2025 (págs. 2, 4, 6, 9, 10, 14) + Auxiliar SIFI (saldos iniciales)",
      "area": "Operativa"
    },
    "fuentes": {
      "estructura": "Contrato FA-2594 Cl. 1 (Definiciones), Cl. Décima Segunda y Décima Tercera (Órganos)",
      "obligacion_beneficiarios": "Contrato FA-2594 Cl. 10.1 y 10.6 (Obligaciones de los Beneficiarios)",
      "cuotas_asamblea": "Contrato FA-2594 Cl. 12.2.3 (Función de la Asamblea: decretar cuotas)",
      "insolvencia": "Rendición H1-2025 págs. 4 (disponible $0), 9 (saldos encargo), 10 (balance general)",
      "operador_deuda": "Auxiliar SIFI Cta 25909501009: $120,264,119 a favor de NIT 900399903",
      "beneficiarios": "Rendición H1-2025 pág. 2: '11 Beneficiarios registrados en el Fideicomiso'"
    }
  }
];

async function main() {
  const fid = await prisma.fideicomiso.findFirst({
    where: { codigoPrincipal: 'FA-2594' },
  });

  if (!fid) {
    console.log('Fideicomiso FA-2594 no encontrado');
    return;
  }

  // Borrar los anteriores
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

  console.log(`Borradas las entradas anteriores. Reinyectadas exitosamente ${inserted.count} entradas FORMATEADAS CON MARKDOWN para Urban Royal 26.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
