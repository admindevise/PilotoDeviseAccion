import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const conocimientoData = [
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Fórmula de cálculo de comisión fiduciaria mensual con IVA oculto y escalamiento por Otrosí",
    "contenido": "La comisión fiduciaria mensual se calcula como: `max(Base_SMMLV × N_salarios, 0.X% × giros_mes) × 1.19 (IVA)`.\n\nEl contrato establece textualmente que _'las comisiones no incluyen I.V.A.'_ (Cláusula 19, Parágrafo 4 del contrato original; Cláusula Quinta del Otrosí No.1 - Rendición Semestral Pág.6), por lo que el IVA del 19% se adiciona **SIEMPRE** sobre la base.\n\n### EVOLUCIÓN DE LA BASE MÍNIMA:\n- **Contrato original (Dic 2022):** 0.3% de giros mensuales, mínimo 2 SMMLV. \n  _Fórmula verificada: 2 × SMMLV_2023($1,160,000) = $2,320,000 × 1.19 = $2,760,800 (coincide con facturas FC85-4186 a FC85-6061)._\n- **Otrosí No.1 (Sep 2024):** 0.5% de giros mensuales, mínimo 4 SMMLV. \n  **ALERTA:** el texto del Otrosí contiene una inconsistencia interna — dice 'CUATRO SALARIOS MÍNIMOS' en letras pero '(2 SMMLV)' en abreviatura. La aplicación práctica es **4 SMMLV** como lo demuestra la facturación: _4 × SMMLV_2024($1,300,000) = $5,200,000 × 1.19 = $6,188,000 (coincide con facturas FC85-8024 en adelante)._\n- **2025:** _4 × SMMLV_2025($1,423,500) = $5,694,000 × 1.19 = $6,775,860 (coincide con facturas FC85-8975 en adelante)._\n\n### COSTOS ADICIONALES OCULTOS POR CADA PAGO DE COMISIÓN:\n1. **Gasto bancario fijo:** $4,500 por transferencia (desglosado como $3,781.51 costo operación + $718.49 IVA bancario, cuentas 51151201001 y 13020501001).\n2. **GMF (4×1000):** Sobre el monto de la comisión pagada (cuenta 51400501005). _Ejemplo verificado: comisión $6,775,860 → GMF = $27,103.44._\n3. **Comisiones eventuales:** estructuración de otrosí (1 SMMLV), registro de cesión (0.5 SMMLV), acompañamiento judicial/comités (3 SMMLV cada uno), apertura de cuenta bancaria (facturable, ej: $1,190,000 en Oct 2025).\n\n> **IMPACTO:** Para 2025, el costo real mensual mínimo del fideicomiso por concepto de comisión fiduciaria es: `$6,775,860 + $4,500 + ~$27,103 = ~$6,807,463/mes`, equivalente a **~$81.7M/año** solo en comisiones mínimas.",
    "metadatos": {
      "origen": "Cláusula 19 Contrato Original + Cláusula Quinta Otrosí No.1 + Rendición Semestral Sec.14 + Estado de Cuenta Comisiones XLSX + Auxiliar Contable SIFI",
      "area": "Facturación"
    },
    "fuentes": {
      "contrato_original": "Cláusula DÉCIMA NOVENA - COMISIÓN FIDUCIARIA, Parágrafos 1-8",
      "otrosi_1": "Cláusula QUINTA - Modificación Cláusula Décima Novena",
      "rendicion_semestral": "Sección 14 - Remuneración de la Fiduciaria",
      "estado_cuenta": "ESTADO_CUENTAS_111528_1.xlsx - Sección Causación de Comisiones (44 facturas)",
      "auxiliar_contable_sifi": "Movimientos tipo 904 EGRESO CAJA con descripción 'COMISION FIDUCIARIA'"
    }
  },
  {
    "tipo": "REGLA_NEGOCIO",
    "titulo": "Cascada de prelación de giros y segregación obligatoria de cuentas recaudadoras por proyecto",
    "contenido": "El fideicomiso opera bajo una estricta cascada de prioridad de pagos (waterfall) que fue modificada por el Otrosí No.1.\n\n### PRELACIÓN VIGENTE (Cláusula Décima Séptima modificada):\n1. **1º → Comisión fiduciaria, costos y gastos del fideicomiso** (SIEMPRE tiene prioridad absoluta).\n2. **2º → Giros mensuales** según CUADRO(S) CRONOLÓGICO(S) DE GIROS.\n3. **3º → FONDO DE RESERVA:** provisión mínima equivalente a UNA cuota del cuadro cronológico de giros. Este fondo es de uso exclusivo para atender pagos en el orden de la cláusula décima cuarta.\n4. **4º → Giros ordenados libremente** por el fideicomitente.\n\n### SEGREGACIÓN DE CUENTAS (Regla crítica del Otrosí No.1):\nEl fideicomiso debe mantener cuentas recaudadoras independientes por proyecto inmobiliario, con la siguiente vinculación:\n- **Cuenta Proyecto 'Monte Ruitoque':** Alimenta exclusivamente el Cuadro Cronológico de MONERE CAPITAL S.A.S. (NIT 900.599.869-9).\n- **Cuenta Proyectos 'Habitat + Bonaterra + Valle Ruitoque':** Alimenta exclusivamente el Cuadro Cronológico de BLOOM CROWDFUNDING S.A. (NIT 901.558.151-8), beneficiario condicionado hasta $4,200,000,000.\n\n> **IMPLICACIÓN OPERATIVA:**\n> No se pueden cruzar recursos entre cuentas para atender giros de un destinatario con fondos provenientes del proyecto asignado al otro. Esto genera un **riesgo de iliquidez parcial**: un proyecto puede tener fondos suficientes mientras el otro no, sin posibilidad de compensación cruzada. \n> \n> En el auxiliar contable SIFI (post-agosto 2024) se observan múltiples encargos fiduciarios separados (`EF1850005652`, `EF1850089887`, `EF1850089889`, `EF1850089892`, `EF1850089893`) que corresponden a las subcuentas por proyecto.",
    "metadatos": {
      "origen": "Cláusula Décima Séptima modificada (Otrosí No.1 Cláusula Sexta) + Definición numeral 11 y 12 del Otrosí No.1",
      "area": "Operativa"
    },
    "fuentes": {
      "contrato_original": "Cláusula DÉCIMA SÉPTIMA - PRELACIÓN DE GIROS (versión original: 3 niveles)",
      "otrosi_1_clausula_sexta": "Modificación a Cláusula Décima Séptima (versión vigente: 4 niveles con FONDO DE RESERVA)",
      "otrosi_1_definiciones": "Numerales 11 (FONDO DE RESERVA) y 12 (RECURSOS) de la Cláusula Primera modificada",
      "auxiliar_contable_sifi": "Encargos Fiduciarios múltiples en movimientos tipo 914 CIERRE FONDO INVERSION"
    }
  },
  {
    "tipo": "RESOLUCION_HALLAZGO",
    "titulo": "Cuádruple facturación de comisiones en noviembre 2024 — corrección por notas crédito",
    "contenido": "### INCIDENTE\nEn noviembre 2024 se generaron **CUATRO** facturas de comisión fiduciaria por el MÍSMO periodo mensual, cada una por $6,188,000:\n- **FC85-8477** (15/11/2024) — Pagada mediante SAF-22478 el 18/11/2024.\n- **FC85-8483** (15/11/2024) — **ANULADA** con Nota Crédito NC2-5600 el 15/11/2024.\n- **FC85-8489** (15/11/2024) — **ANULADA** con Nota Crédito NC2-5601 el 15/11/2024.\n- **FC85-8500** (19/11/2024) — **ANULADA** con Nota Crédito NC2-5610 el 19/11/2024.\n\n### CONTEXTO\nEste incidente ocurrió durante el mes inmediatamente posterior al registro de la cesión (Sep 2024) y la entrada en vigor del Otrosí No.1, período en que se estaban reconfigurando los parámetros del fideicomiso (cambio de fideicomitente de Ciudad Ruitoque a Vimarsa Colombia, duplicación de comisión, apertura de nuevas cuentas).\n\nDe hecho, en septiembre 2024 también se observa doble facturación: `FC85-8024` (a nombre de Ciudad Ruitoque) y `FC85-8038` (a nombre de Vimarsa Colombia), ambas por $6,188,000, donde la primera fue ajustada con NC2-5414.\n\n### RESOLUCIÓN\nLas 3 facturas duplicadas fueron corregidas mediante notas crédito (NC2), dejando saldo en cero. El estado de cuenta al 24/11/2025 confirma `total deuda = $0`.\n\n> **PROCEDIMIENTO DE MITIGACIÓN OBLIGATORIO:**\n> Ante cada período de transición contractual (cesiones, otrosís, cambio de fideicomitente), el controlador fiduciario debe verificar en el mes siguiente que no se hayan generado facturas duplicadas por coexistencia de parámetros del fideicomitente saliente y entrante. Verificar cruzando el número de facturas causadas contra el número esperado (1 por mes por concepto regular).",
    "metadatos": {
      "origen": "Estado de Cuenta Comisiones XLSX — Secciones Causación y Recaudos Nov 2024",
      "area": "Facturación"
    },
    "fuentes": {
      "estado_cuenta_causacion": "Filas con facturas FC85-8477, FC85-8483, FC85-8489, FC85-8500",
      "estado_cuenta_recaudos": "Filas con NC2-5600, NC2-5601, NC2-5610, SAF-22478",
      "estado_cuenta_resumen": "TOTAL DEUDA = 0 — Comisiones Causadas = Comisiones Pagadas = $189,456,726"
    }
  },
  {
    "tipo": "PRECEDENTE_CONTABLE",
    "titulo": "Reclasificación contable dic-2023: reversión masiva de cuenta 35100501001 a 16320001001",
    "contenido": "### HECHO CONTABLE\nEl 12 de diciembre de 2023 se ejecutó una **operación masiva de reversión** (tipo movimiento `63` - REVERSION DE DOCUMENTOS) seguida de re-causación (tipo `62`) para los giros de diciembre 2023.\n\nLos movimientos originales habían sido registrados con la contrapartida en cuenta `35100501001` (RESTITUCIÓN DE APORTES), pero fueron revertidos y re-causados usando la cuenta `16320001001` (CONTRATOS) para los siguientes beneficiarios:\n- **MONERE CAPITAL S.A.S.** (NIT 900599869): $3,766,500 × 3 giros.\n- **MARIANELA VELILLA OROZCO** (CC 1129579218): $4,464,000.\n_Las descripciones de las reversiones contienen el prefijo 'ANULACIONANULA 111528-FA-5999 FIDEICOMISO DE ADMINISTRACION'._\n\n### MAPEO DE CUENTAS VIGENTE PARA GIROS A TERCEROS:\n- **`25110501001` (PROVEEDORES):** Se acredita al causar la obligación de pago → representa el pasivo con el destinatario del giro.\n- **`35100501001` (RESTITUCIÓN DE APORTES):** Se debita como contrapartida habitual del giro → registra la disminución del patrimonio fideicomitido. Esta es la cuenta ESTÁNDAR usada en >95% de los giros históricos.\n- **`16320001001` (CONTRATOS):** Usada EXCEPCIONALMENTE en diciembre 2023 como contrapartida alternativa. Sugiere una reclasificación de la naturaleza del giro (de 'restitución de aporte' a 'ejecución de contrato').\n- **`13020501001` (FONDO COMÚN ORDINARIO 1):** Debita en el egreso real (tipo `2`) → registra la salida efectiva de recursos del fondo de inversión.\n- **`51151201001` (SERVICIOS BANCARIOS):** Registra costo operativo ($3,781.51) + IVA ($718.49) = $4,500 fijo por cada giro.\n- **`51400501005` (GMF):** Registra el Gravamen a los Movimientos Financieros (4×1000) sobre cada desembolso.\n\n> **NOTA SIFI:** A partir de agosto 2024 (migración al sistema SIFI), los giros a terceros cambian de tipo movimiento: ya no usan tipo `2`/`62` sino tipo `904` (EGRESO CAJA) y tipo `901` (CAUSACIONES PAGO PROVEEDORES), y aparece la cuenta `51151801001` (NEGOCIOS FIDUCIARIOS) para registrar la comisión como gasto del negocio fiduciario.",
    "metadatos": {
      "origen": "Auxiliar Contable 111528 (principal) — Movimientos del 12/12/2023 + Auxiliar SIFI (referencia post-migración)",
      "area": "Contabilidad"
    },
    "fuentes": {
      "auxiliar_contable_principal": "Movimientos tipo 63 (REVERSION) y tipo 62 (CAUSACION) del 12/12/2023, usuario YRAIGOSA",
      "auxiliar_contable_historico": "Patrón estándar de giros Ene 2023 - Nov 2023 usando cuenta 35100501001",
      "auxiliar_contable_sifi": "Movimientos tipo 901 y 904 post-agosto 2024, nuevas cuentas 51151801001"
    }
  },
  {
    "tipo": "CONTEXTO_OPERATIVO",
    "titulo": "Obligaciones tributarias cruzadas: GMF 4×1000 y contribución especial en cada operación del fideicomiso",
    "contenido": "TODO desembolso del fideicomiso genera automáticamente el **Gravamen a los Movimientos Financieros (GMF) del 4×1000** (Artículo 871 del Estatuto Tributario colombiano).\n\nEste gravamen se aplica sobre CADA transacción individual, no sobre el neto mensual, lo que significa que a mayor número de giros, mayor carga tributaria acumulada.\n\n### CONTABILIZACIÓN VERIFICADA:\n- **DÉBITO:** Cuenta `51400501005` (GRAVAMEN A LOS MOVIMIENTOS FINANCIEROS) — registra el gasto.\n- **CRÉDITO:** Cuenta `13020501001` (FONDO COMÚN ORDINARIO 1) — sale del fondo de inversión.\n- **Tipo movimiento:** `46` (EGRESO SIN CHEQUE) en sistema antiguo; parte del tipo `904` en SIFI.\n- **Descripción típica:** _'GRAVAMEN FINANCIERO 4*1000'_ / _'CONTRIBUCIÓN ESPECIAL (5)'_.\n\n### CÁLCULO ESTÁNDAR\n`GMF = Monto_del_giro × 0.004`\n\n**Ejemplos verificados del auxiliar contable:**\n- Giro $13,000,000 a Ciudad Ruitoque (08/03/2023): `GMF = $52,000` ✓\n- Giro $3,766,500 a Monere Capital + $4,500 bancario (19/05/2023): `GMF = $15,084` (~$15,066 registrado, diferencia por redondeo).\n- Comisión fiduciaria $2,760,800 (12/10/2023): `GMF = $11,043.20` ✓\n- Comisión fiduciaria $6,775,860 (13/08/2025 SIFI): `GMF = $27,103.44` ✓\n\n> **IMPACTO ANUAL ESTIMADO:**\n> Con un promedio de ~8-12 giros mensuales (destinatarios + comisiones + bancarios), el GMF acumulado es un costo operativo no trivial que debe presupuestarse. En el auxiliar contable 2023, la cuenta 51400501005 acumula ~$965,061 en cargos de GMF (dato de saldos iniciales SIFI). Este costo es ADICIONAL a la comisión fiduciaria y a los gastos bancarios, y recae directamente sobre los recursos del fideicomiso, reduciendo el patrimonio disponible para giros a destinatarios.",
    "metadatos": {
      "origen": "Auxiliar Contable 111528 (ambos sistemas) — Movimientos tipo 46 y tipo 904 + Saldos iniciales SIFI",
      "area": "Contabilidad"
    },
    "fuentes": {
      "auxiliar_contable_principal": "Todos los movimientos en cuenta 51400501005 (tipo 46 - EGRESO SIN CHEQUE)",
      "auxiliar_contable_sifi": "Movimientos con descripción 'CONTRIBUCIÓN ESPECIAL (5)' en tipo 904",
      "saldos_iniciales_sifi": "Saldo acumulado cuenta 51400501005: $965,061.10 al 31/08/2024",
      "normativa": "Artículo 871 del Estatuto Tributario de Colombia — GMF 4×1000"
    }
  }
];

async function main() {
  const fid = await prisma.fideicomiso.findFirst({
    where: { codigoPrincipal: 'FA-5999' },
  });

  if (!fid) {
    console.log('Fideicomiso FA-5999 (VimarSa) no encontrado');
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

  console.log(`Inyectadas exitosamente ${inserted.count} entradas FORMATEADAS CON MARKDOWN para Fideicomiso Vimarsa (FA-5999).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
