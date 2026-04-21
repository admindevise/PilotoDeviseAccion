import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const conocimientoData = [
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Umbral oculto de monetización USD 2M activa escala de comisiones variables con efecto cascada",
    "contenido": "La cláusula séptima numeral 3 del contrato establece un sistema de comisiones variables escalonadas que se activa SOLO cuando las operaciones de monetización mensuales superan **USD 2,000,000**.\n\nEste umbral está 'oculto' dentro de la comisión fija de administración (numeral 2), que cubre monetizaciones HASTA USD 2M.\n\n### MECANISMO DE COBRO:\n1. Se acumulan las monetizaciones del mes calendario.\n2. Si el acumulado mensual ≤ USD 2M, **no hay comisión variable**.\n3. Si el acumulado > USD 2M, el EXCEDENTE genera comisión por cada millón o FRACCIÓN de millón, donde 'fracción' significa que incluso USD 0.01 sobre un umbral de millón **genera el cobro completo** del siguiente tramo.\n\n### ESCALA APLICABLE:\n- **USD 2.01M - 6M:** 3 SMMLV/millón\n- **USD 6.01M - 8M:** 3.25 SMMLV/millón\n- **USD 8.01M - 11M:** 3.5 SMMLV/millón\n- **USD 11.01M - 15M:** 4 SMMLV/millón\n_(TODAS + IVA 19%)_\n> **Nota:** Operaciones sobre USD 15M requieren aprobación previa de la Fiduciaria y comisión negociada aparte.\n\n### IMPLICACIÓN ECONÓMICA:\nEn un mes con monetización de USD 3,100,000, la comisión variable sería 2 tramos × 3 SMMLV (por USD 2.01M-3M y fracción de 3.01M-4M) = 6 SMMLV + IVA. Con SMMLV 2025 ($1,423,500), esto equivale a **$10,163,790 ADICIONALES** a la comisión fija mensual de $8,469,825. El controlador debe solicitar mensualmente el reporte de monetizaciones al área de operaciones cambiarias para validar si se supera el umbral y si la comisión variable fue correctamente facturada.",
    "metadatos": {
      "origen": "Contrato de Fiducia Mercantil, Cláusula Séptima, numerales 2 y 3 (literales A-M)",
      "area": "Facturación"
    },
    "fuentes": {
      "contrato": "Contrato_de_fiducia_mercantil.pdf, páginas 14-15",
      "rendicion": "110100_FA5931_FIDEICOMISO_SAUTARI_FB_901430849.pdf, páginas 7-8",
      "precedente": "FC20-45099 (junio 2023): única factura variable detectada. Monetización USD 2,149,725.10 → excedente USD 149,725 = 1 fracción de millón → 3 SMMLV 2023 ($3,480,000) + IVA = $4,141,200",
      "correo": "MONETIZACION.html confirma las cifras de junio 2023"
    }
  },
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Cupo de 10 giros mensuales incluidos - giros adicionales a $50,000+IVA ajustados por IPC anual",
    "contenido": "La comisión de administración mensual (5 SMMLV) incluye un cupo operativo de hasta **10 giros mensuales**. Cada giro que exceda este límite genera un cargo de **$50,000 más IVA** ($59,500 a tarifa 2022), ajustable CADA AÑO según la variación del Índice de Precios al Consumidor (IPC) del año inmediatamente anterior.\n\n### ADVERTENCIA PARA EL CONTROLADOR:\n1. **Ajuste acumulativo:** El ajuste por IPC es acumulativo desde 2022, no se toma el IPC del año corriente sino la variación del año anterior. Para 2025, se aplica IPC 2024.\n2. **Control manual:** El contrato no establece un mecanismo formal de notificación cuando se exceden los 10 giros; la fiduciaria debe llevar **control propio** del número de giros procesados por mes.\n3. **Posible fuga:** A la fecha de esta auditoría no se han detectado facturas por giros adicionales en el Estado de Cuentas, lo que puede significar que nunca se superó el cupo de 10 giros/mes, O que la fiduciaria no ha controlado/facturado este concepto. Se recomienda cruzar con el log de operaciones de pago mensual para confirmar.",
    "metadatos": {
      "origen": "Contrato de Fiducia Mercantil, Cláusula Séptima, numeral 2, segundo párrafo",
      "area": "Facturación"
    },
    "fuentes": {
      "contrato": "Contrato_de_fiducia_mercantil.pdf, página 14",
      "rendicion": "110100_FA5931_FIDEICOMISO_SAUTARI_FB_901430849.pdf, página 7",
      "estadoCuenta": "ESTADO_CUENTAS_110100.xlsx - No se identifican facturas por concepto de giros adicionales en el histórico completo (nov-2022 a nov-2025)"
    }
  },
  {
    "tipo": "PRECEDENTE_CONTABLE",
    "titulo": "Mapeo contable de comisiones: cuentas PUC, flujo de causación y pago en sistemas Legacy y SIFI",
    "contenido": "El fideicomiso utiliza un flujo contable DIRECTO (sin paso por anticipo) para el registro de comisiones fiduciarias. El mapeo de cuentas es el siguiente:\n\n### CAUSACIÓN:\n- **Débito:** `25011501001` (COMISION POR ADMINISTRACION, pasivo CxP a Acción Fiduciaria NIT 800155413)\n- **Crédito:** `35101002009` (COMISION FIDUCIARIA, patrimonio especial, a nombre de Cartera Colectiva Acción Fiduciaria NIT 800193848)\n\nEste doble registro refleja que la comisión se causa en el pasivo del fideicomiso y **simultáneamente se reconoce como componente patrimonial del FIC**.\n\n### PAGO (EGRESO):\n- **Débito:** `25011501001` (liquidación del pasivo)\n- **Crédito:** `13020501001` (FONDO COMUN ORDINARIO, salida de caja)\n\n**Tipo de comprobante:**\n- `904` (EGRESO CAJA) en SIFI\n- Tipo `2` (EGRESOS) en Legacy\n- Tipo `62` (CAUSACION DE PAGOS) para la causación en Legacy\n\n### COSTOS ASOCIADOS AL PAGO:\nCada pago genera:\n- (a) **$3,781.51** débito a `51151201001` (SERVICIOS BANCARIOS) por costo de operación.\n- (b) **$718.49** débito a `35101002009` (COMISION FIDUCIARIA) por comisión del FIC sobre la transferencia.\n_Estos dos suman $4,500 fijos._\n- (c) **GMF (4x1000)** registrado en `51400501005` (GRAVAMEN A LOS MOVIMIENTOS FINANCIEROS).\n\n> **NOTA DE MIGRACIÓN:** En sistema SIFI los comprobantes tipo 904 tienen numeración secuencial simple (16, 22, 28...). En Legacy usaban numeración compuesta. Los cierres de fondo de inversión usan comprobante tipo 914.",
    "metadatos": {
      "origen": "AuxiliarContable110100.txt (Legacy, nov-2022 a ago-2024) y AuxiliarContable110100_sifi.txt (SIFI, ago-2024 a nov-2025)",
      "area": "Contabilidad"
    },
    "fuentes": {
      "auxiliarLegacy": "AuxiliarContable110100.txt - Registros de causación tipo 62 y egresos tipo 2 para facturas FC20-38146 a FC20-56782",
      "auxiliarSIFI": "AuxiliarContable110100_sifi.txt - Registros de egreso tipo 904 para facturas FC20-61714 a FC20-71576",
      "cuentasPUC": "25011501001, 35101002009, 13020501001, 51151201001, 51400501005"
    }
  },
  {
    "tipo": "RESOLUCION_HALLAZGO",
    "titulo": "Precedente de mora en pagos iniciales (2022-2023): protocolo de intereses y regularización",
    "contenido": "### ANTECEDENTE:\nLas facturas de constitución del fideicomiso (estructuración FC20-38146, administración nov-2022 FC20-38147/38150, dic-2022 FC20-38943, ene-2023 FC20-39796) se emitieron entre noviembre 2022 y enero 2023 pero **NO se pagaron hasta el 31 de enero de 2023** (recaudos RCJ-301613 a RCJ-301621), generando mora de 82, 82, 81, 53 y 25 días respectivamente.\n\n### RESOLUCIÓN:\nEl 01 de febrero de 2023, la fiduciaria facturó **intereses de mora** sobre capital e IVA de cada factura atrasada mediante 5 notas de cobro (FC20-40395 a FC20-40399).\n\n**Montos de intereses:**\n- FC20-40395: $381,126 (capital) + $60,851 (IVA)\n- FC20-40396: $330,309 + $52,739\n- FC20-40397: $50,119 + $8,002\n- FC20-40398: $219,714 + $35,080\n- FC20-40399: $66,977 + $10,694\n**Total intereses:** $1,214,612.\n_Todos fueron cobrados el mismo día (01-feb-2023)._\n\n### PROTOCOLO ESTABLECIDO:\nEste caso sentó el precedente de que la fiduciaria **SÍ cobra intereses moratorios** y que los factura como líneas separadas (capital vs. IVA del interés).\n\n**LECCIÓN PARA EL CONTROLADOR:**\nA partir de abril 2024, la migración a descuento automático FIDUSAP eliminó de facto el riesgo de mora al descontar directamente de los recursos del fideicomiso. Sin embargo, si por insuficiencia de fondos en el encargo un descuento automático falla, el **protocolo de intereses moratorios sigue vigente**.",
    "metadatos": {
      "origen": "ESTADO_CUENTAS_110100.xlsx, sección CAUSACION DE COMISIONES y RECAUDOS RECIBIDOS, período ene-feb 2023",
      "area": "Facturación"
    },
    "fuentes": {
      "estadoCuenta": "ESTADO_CUENTAS_110100.xlsx - Facturas FC20-40395 a FC20-40399 y recaudos RCJ-301612 a RCJ-301620",
      "auxiliarLegacy": "AuxiliarContable110100.txt - Registros de causación y pago de intereses en período 2023-01 y 2023-02",
      "contrato": "Cláusula contractual de intereses moratorios implícita en condiciones de pago anticipado"
    }
  },
  {
    "tipo": "CONTEXTO_OPERATIVO",
    "titulo": "Migración ERP ago-2024 y cambio de medio de pago: impacto en trazabilidad contable",
    "contenido": "El fideicomiso experimentó **dos cambios operativos significativos** que afectan la auditoría de comisiones:\n\n### 1. MIGRACIÓN DE ERP (31-ago-2024)\nLa contabilidad migró del sistema Legacy al sistema SIFI. El evento de corte se registra en el auxiliar SIFI como comprobante tipo `906` (NOTAS CONTABLES), nro. 1, con 2,069 renglones de 'CARGUE DE SALDOS INICIALES' al 31/08/2024.\n\n**Saldos iniciales incluyen:**\n- $4,862,374.31 en `51080501001` (desvalorización)\n- $250,000,000 en `35100501001` (restitución aportes GOLD MINER D&P SAS)\n- $33,769.03 en `35101002009` (comisión fiduciaria FIC)\n- $15,470,000 en `16909501005` (anticipos de utilidades a Acción Fiduciaria)\n\n> **IMPLICACIÓN:** Cualquier búsqueda de movimientos contables ANTERIORES al 01-sep-2024 debe hacerse en `AuxiliarContable110100.txt` (Legacy); desde esa fecha, en `AuxiliarContable110100_sifi.txt`. NO hay solapamiento completo.\n\n### 2. CAMBIO DE MEDIO DE PAGO (abr-2024)\nLos recaudos de comisiones pasaron de transferencia bancaria Banco de Occidente (observación _'REC.BANCO/OCCIDENTE REF Nro...'_ ) a descuento automático del sistema fiduciario (observación _'REC/DESCUENTO FIDUSAP FACTURA NRO...'_ ).\n\n**La excepción** es la factura FC20-59624 (nov-2024) que recibió un **pago híbrido**:\n- $3,094,000 por transferencia bancaria (RCJ-370173)\n- $4,641,000 por descuento FIDUSAP (RCJ-371127)\n\n> **IMPLICACIÓN:** Para conciliaciones post-abril-2024, la referencia de recaudo en el Estado de Cuentas se alinea directamente con el número de factura, facilitando el cruce. Para períodos anteriores, la referencia es el número de factura precedido de 'REF Nro 1:' seguido del sufijo numérico de la factura.",
    "metadatos": {
      "origen": "AuxiliarContable110100_sifi.txt (evento de migración), ESTADO_CUENTAS_110100.xlsx (cambio en observaciones de recaudo)",
      "area": "Operativa"
    },
    "fuentes": {
      "auxiliarSIFI": "AuxiliarContable110100_sifi.txt - Comprobante 906 nro. 1 del 31/08/2024, usuario UMIGRA1",
      "estadoCuenta": "ESTADO_CUENTAS_110100.xlsx - Transición visible entre RCJ-343341 (mar-2024, BANCO/OCCIDENTE) y RCJ-347466 (abr-2024, DESCUENTO FIDUSAP)",
      "excepcion": "RCJ-370173 (nov-2024): pago híbrido transferencia + descuento para FC20-59624"
    }
  }
];

async function main() {
  const fid = await prisma.fideicomiso.findFirst({
    where: { codigoPrincipal: 'FA-5931' },
  });

  if (!fid) {
    console.log('Fideicomiso FA-5931 (SAUTARI) no encontrado');
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

  console.log(`Inyectadas exitosamente ${inserted.count} entradas FORMATEADAS CON MARKDOWN para Fideicomiso SAUTARI (FA-5931).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
