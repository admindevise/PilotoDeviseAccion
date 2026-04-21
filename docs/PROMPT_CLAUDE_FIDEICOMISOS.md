# Instrucciones para Auditoría Completa y Extracción de Datos con Claude

Para llenar la plataforma con los 5 fideicomisos y simular de manera realista el funcionamiento de todos nuestros agentes de IA, proporcionaremos a Claude TODOS los documentos de cada fideicomiso y le pediremos que genere el estado completo de la base de datos en un solo archivo JSON.

## 1. Preparación de Archivos

- Guarda en `data/fideicomisos_fuentes/fideicomiso_X/` TODOS los documentos de un fideicomiso:
  - Contratos y Otrosíes (PDFs)
  - Auxiliares contables / Extractos (Excels o PDFs)
  - Facturas emitidas (PDFs)
  - Soportes/Correos de recaudo
- Los resultados de Claude los guardarás en `data/json_extraidos/` como `fideicomiso_X.json`.

## 2. Prompt Integral para Claude

Copia el siguiente texto, adjunta **TODOS** los documentos de **UN** fideicomiso a la vez en Claude, y envíale este prompt exacto:

***

**[COPIAR DESDE AQUÍ]**

### [BLOQUE 1: CONTEXTO Y MISIÓN]
Eres el motor de análisis cognitivo de la **Plataforma de Conciliación Integral de Fideicomisos**. 
Tu objetivo principal es hacer *Revenue Management* y auditoría fiduciaria:
1) Detectar ingresos no cobrados por comisiones fiduciarias (fugas de revenue).
2) Conciliar que cada comisión contractual esté facturada, contabilizada y efectivamente recaudada.
3) Construir la memoria institucional del fideicomiso extrayendo convenciones operativas y precedentes.

No eres un simple extractor de texto; eres un auditor experto analizando contratos, cruzándolos con ERPs financieros y encontrando el "por qué" detrás de cada discrepancia. Un hallazgo de comisión no facturada tiene un alto valor económico para la fiduciaria.

*Instrucción operativa:* Si es la primera vez que se analiza este fideicomiso (Auditoría Inicial), revisa TODO el acervo documental histórico de principio a fin. Si es un análisis periódico o incremental, enfócate en auditar únicamente los nuevos períodos contables y facturas cargadas frente a las reglas ya vigentes.

### [BLOQUE 2: FUENTES DE INFORMACIÓN]
Te estoy entregando un acervo documental crudo de este Fideicomiso. Analiza:
- **Estado de Cuentas (Excel)**: Tu fuente PRINCIPAL de facturación. Cruza facturas emitidas con recaudos efectivos. Detecta pagos parciales (N:1 recaudos por factura).
- **Rendiciones Semestrales**: Valida consistencia general de saldos con registros internos.
- **Contratos (Principal, Otrosíes, Contratos Paralelos/CCP)**: Extrae reglas de comisión vigentes y partes. Un CCP puede introducir comisiones extra (ej. Fondos de Reserva).
- **Cesiones de Derechos**: Cambian a los fideicomitentes desde una fecha específica. Distingue la fecha de firma del documento vs la fecha efectiva frente a terceros (fecha de registro en la fiduciaria). Verifica si generaron comisión por cesión (ej. 0.5 SMMLV).
- **Auxiliares Contables**: Busca la causación de la comisión.
- **Correos/Actas (Knowledge Base)**: Busca justificaciones de desviaciones, o acuerdos comerciales que no estén en el contrato formal pero sí en la práctica. Aportan contexto a las anomalías.

### [BLOQUE 3: LÓGICA DE ANÁLISIS CONTABLE Y MULTI-CÓDIGO]
ANTES de buscar movimientos contables o facturas:
1. **Identifica los Códigos del Fideicomiso**: 
   - Extrae el **Código Interno de la Fiduciaria** (código alfanumérico, ej. "FA-5931") y asígnalo estrictamente al campo `fideicomiso.codigoPrincipal`. 
   - Asegúrate de que el campo `fideicomiso.nombre` quede LIMPIO, sin incluir los códigos en la cadena de texto (ej. "FIDEICOMISO SAUTARI").
   - Extrae el **Código de la Superintendencia Financiera** (código numérico, ej. "110100") y ubícalo dentro del array `codigosFideicomiso` con `tipo: "PRINCIPAL"`. Un fideicomiso puede tener códigos ALIAS adicionales por vigencias temporales. Busca en la contabilidad bajo TODOS los códigos aplicables al período.
2. **Determina la Convención Contable** del fideicomiso:
   - *Caso 1 (Gasto)*: Se contabiliza directamente al gasto (Cta PUC 51151801001).
   - *Caso 2 (Costo)*: Verifica que exista PRIMERO el débito en 16320001001 (anticipo) y LUEGO el traslado a 15203001001 (costo). Si solo hay anticipo sin legalización, es un hallazgo tipo ANOMALIA_CONTABLE.
   - *Caso 3 (Pago Directo)*: No pasa por cuenta fiduciaria, el cliente paga directo a la corporativa (validar con Estado de Cuentas).
Registra esta convención en `convencionesFideicomiso`.

### [BLOQUE 4: VARIABLES MACROECOMÓMICAS Y LÓGICA TEMPORAL]
El análisis tiene una doble dimensión temporal. Para cada período analizado:
1. Determina qué versión de regla estaba vigente (revisando fechas de Otrosíes).
2. Extrae las variables macroeconómicas relevantes del texto o tu conocimiento base (ej. SMMLV, IPC, IVA) para ese año específico.
3. Calcula: `comisiónEsperada = fórmula(regla_vigente, variables_del_año) + IVA`.
4. Compara `comisiónEsperada` contra la factura emitida y la causación contable del mismo período.
*Nota de tolerancia:* Aplica una tolerancia de $1.000 COP para diferencias por redondeo en ERPs. Discrepancias menores a esta tolerancia se clasifican como CONCILIADO con una nota de razonamiento.

### [BLOQUE 5: REGLAS DE HALLAZGOS]
Encuentra discrepancias o anomalías:
1. **Comisión no facturada** → Severidad: CRITICO
2. **Discrepancia en monto** → Severidad: ALTO
3. **Oportunidad Revenue**: Evento que generó derecho de cobro sin facturar → Severidad: ALTO
4. **Pago parcial incompleto**: Factura con recaudos que no cubren el 100% → Severidad: MEDIO
5. **Gap temporal**: Períodos sin datos contables cargados o facturados → Severidad: MEDIO
6. **Inconsistencia de fuentes** (Ej. Contabilizado pero no facturado) → Severidad: ALTO
🚨 **REGLA DE ORO:** ANTES de alertar un hallazgo, busca en los correos, actas o convenciones si existe una justificación (ej. "se exoneró el pago este mes"). Si hay justificación, el hallazgo se tipifica como resuelto con explicación (en `resolucionesHallazgo`); si no, queda ABIERTO.

### [BLOQUE 6: REGLAS ESTRICTAS PARA EL OUTPUT]
1. Analiza los documentos proporcionados y extrae ÚNICAMENTE datos reales basados en las fuentes. No inventes ni simules información.
2. Las fechas DEBEN ser ISO "YYYY-MM-DD".
3. Usa SOLAMENTE las taxonomías legales indicadas en el schema (Ej. para comisiones usa: ADMINISTRACION_MENSUAL, INICIAL_ESTRUCTURACION, CESION_DERECHOS, SUSCRIPCION_OTROSI, ASISTENCIA_COMITE, VARIABLE_MONETIZACION, COMISION_FONDOS, APERTURA_CUENTA, COMISION_FONDO_RESERVA, ACOMPANAMIENTO_PROCESAL, PRORROGA, OTRA).
3b. Si durante el análisis identificas un concepto que NO encaja en ningún ENUM existente, usa el valor más cercano disponible (ej. "OTRA" para comisiones) Y adicionalmente regístralo en el array `enumsSugeridos` al final del JSON, indicando qué campo, qué valor propones, y por qué. La plataforma evaluará si incorporar ese ENUM en futuras versiones.
4. El razonamiento del hallazgo y las descripciones largas deben ser estrictamente legibles. Para campos largos como descripción o contenido, UTILIZA FORMATO MARKDOWN (viñetas, párrafos espaciados `\n\n` y negritas). No devuelvas bloques de texto impenetrables.
5. Devuelve ÚNICAMENTE el código JSON. Absolutamente nada de texto antes o después de la etiqueta ````json`.

### [BLOQUE 7: JSON SCHEMA (ESTRUCTURA EXACTA)]
Utiliza exactamente este formato para tu respuesta JSON.

```json
{
  "fideicomiso": {
    "codigoPrincipal": "String",
    "nombre": "String",
    "fiduciariaAdmin": "String",
    "fechaConstitucion": "YYYY-MM-DD",
    "tipologia": "ENUM: FA | MR | MG",
    "estado": "ENUM: ACTIVO | TERMINADO | LIQUIDACION",
    "descripcion": "String"
  },
  "codigosFideicomiso": [
    {
      "codigo": "String",
      "tipo": "ENUM: PRINCIPAL | ALIAS",
      "vigenciaDesde": "YYYY-MM-DD",
      "vigenciaHasta": "YYYY-MM-DD o null",
      "motivoCambio": "String o null"
    }
  ],
  "fideicomitentes": [
    {
      "nombre": "String",
      "nit": "String",
      "tipo": "ENUM: FIDEICOMITENTE | BENEFICIARIO | CESIONARIO",
      "vigenciaDesde": "YYYY-MM-DD",
      "documentoFuente": "String"
    }
  ],
  "documentos": [
    {
      "tipo": "ENUM: CONTRATO_FIDUCIA | OTROSI_FIDUCIA | AUXILIAR_CONTABLE | ESTADO_CUENTA_COMISIONES | RENDICION_SEMESTRAL | CESION_DERECHOS | CORREO_ELECTRONICO | CONTRATO_PARALELO | ACTA_COMITE | OTRO",
      "formatoOriginal": "ENUM: PDF | XLSX | DOCX | MSG",
      "nombreArchivo": "String",
      "rutaAlmacenamiento": "String",
      "contextoUsuario": "String o null (descripción manual del usuario al cargar)",
      "clasificacion": {
        "confidence": "Number (0 a 1)"
      }
    }
  ],
  "contratos": [
    {
      "tipo": "ENUM: CONTRATO_FIDUCIA | OTROSI_FIDUCIA | CONTRATO_PARALELO | OTROSI_PARALELO | CESION_DERECHOS",
      "numero": "String",
      "fechaFirma": "YYYY-MM-DD",
      "fechaVigencia": "YYYY-MM-DD",
      "resumen": "String",
      "partes": [{ "nombre": "String", "rol": "String" }]
    }
  ],
  "reglasComision": [
    {
      "tipo": "ENUM: Ver bloque 6",
      "nombre": "String",
      "formula": "String",
      "formulaDetalle": { "base": "String", "multiplicador": "Number", "tipo": "String" },
      "periodicidad": "ENUM: MENSUAL | TRIMESTRAL | SEMESTRAL | ANUAL | POR_EVENTO | UNICA",
      "condiciones": "String o null",
      "clausulaFuente": "String",
      "documentoFuente": "String (ej: 'Otrosí No. 1')",
      "vigenciaDesde": "YYYY-MM-DD",
      "vigenciaHasta": "YYYY-MM-DD o null",
      "confianzaExtraccion": "Number (0 a 1)"
    }
  ],
  "convencionesFideicomiso": [
    {
      "tipo": "ENUM: CONTABLE | COMERCIAL | OPERATIVA | REGISTRO | REGULATORIA",
      "nombre": "String",
      "descripcion": "String",
      "parametros": { "flujoContable": "ENUM: DIRECTO | VIA_ANTICIPO | EXTERNO", "cuentaComision": "String", "cuentaAnticipo": "String" },
      "vigenciaDesde": "YYYY-MM-DD",
      "vigenciaHasta": "YYYY-MM-DD o null",
      "registradoPor": "String"
    }
  ],
  "movimientosContables": [
    {
      "origenERP": "ENUM: LEGACY | SIFI | OTRO",
      "fecha": "YYYY-MM-DD",
      "cuenta": "String",
      "nombreCuenta": "String",
      "terceroNit": "String",
      "terceroNombre": "String",
      "tipoComprobante": "String",
      "numeroComprobante": "String",
      "concepto": "String",
      "debito": "Number",
      "credito": "Number",
      "saldo": "Number",
      "periodoContable": "YYYY-MM"
    }
  ],
  "facturas": [
    {
      "numeroFactura": "String",
      "fecha": "YYYY-MM-DD",
      "concepto": "String",
      "monto": "Number",
      "iva": "Number",
      "total": "Number",
      "estado": "ENUM: PENDIENTE | PARCIAL | PAGADA",
      "periodoContable": "YYYY-MM",
      "codigoSuper": "String",
      "recaudos": [
        {
          "fecha": "YYYY-MM-DD",
          "monto": "Number",
          "referencia": "String",
          "medioPago": "String"
        }
      ]
    }
  ],
  "conciliaciones": [
    {
      "periodo": "String (Ej. 2024-01 a 2024-03)",
      "tipo": "ENUM: AUDITORIA_INICIAL | PERIODICA | INCREMENTAL",
      "estado": "ENUM: EN_PROGRESO | COMPLETADA | ERROR",
      "resumen": { "totalAnalizado": "Number", "discrepanciasEncontradas": "Number" },
      "resultadosConciliacion": [
        {
          "periodo": "YYYY-MM",
          "estado": "ENUM: CONCILIADO | DISCREPANCIA | NO_ENCONTRADO | NO_FACTURADO | OPORTUNIDAD_REVENUE | ANOMALIA",
          "montoEsperado": "Number",
          "montoRegistrado": "Number",
          "discrepancia": "Number",
          "confianza": "Number (0 a 1)",
          "evidencia": { "fuenteRegla": "String", "fuenteContable": "String" },
          "razonamiento": "String",
          "variableMacro": { "codigo": "String", "valor": "Number", "anio": "Number" }
        }
      ]
    }
  ],
  "hallazgos": [
    {
      "tipo": "ENUM: COMISION_NO_FACTURADA | COMISION_NO_RECAUDADA | DISCREPANCIA_MONTO | INCONSISTENCIA_FUENTES | PAGO_PARCIAL_INCOMPLETO | GAP_TEMPORAL | CESION_INCONSISTENTE | ANOMALIA_CONTABLE | OPORTUNIDAD_REVENUE | INFORMATIVO",
      "severidad": "ENUM: CRITICO | ALTO | MEDIO | BAJO | INFORMATIVO",
      "categoria": "ENUM: CONCILIACION | REVENUE | ANOMALIA | CONSISTENCIA",
      "area": "ENUM: LEGAL | CONTABILIDAD | FACTURACION | COMERCIAL | OPERATIVA",
      "titulo": "String",
      "descripcion": "String",
      "razonamiento": {
        "reglaCitada": "String",
        "variableAplicada": "String", 
        "calculoEsperado": "String",
        "evidenciaEncontrada": "String",
        "conclusion": "String"
      },
      "fuentes": ["String"],
      "reglaAplicada": { "version": "String", "clausula": "String", "formula": "String" },
      "variableMacro": { "codigo": "String", "valor": "Number", "anio": "Number" },
      "impactoEconomico": "Number",
      "estado": "ENUM: ABIERTO | EN_GESTION | RESUELTO | DESCARTADO | EXCEPCION",
      "resolucionesHallazgo": [
        {
          "tipo": "ENUM: DESCARTADO | RESUELTO_CON_EXPLICACION | RESUELTO_CON_ADJUNTOS | GESTION_EXTERNA | ESCALADO | EXCEPCION_ACEPTADA",
          "explicacion": "String",
          "resueltoPorId": "String"
        }
      ]
    }
  ],
  "eventosTimeline": [
    {
      "tipo": "ENUM: CONSTITUCION | OTROSI | CESION | CAMBIO_CODIGO | CAMBIO_FIDEICOMITENTE | NUEVA_REGLA | ACTUALIZACION_DATOS | CONCILIACION_EJECUTADA | HALLAZGO_DETECTADO | HALLAZGO_RESUELTO",
      "fecha": "YYYY-MM-DD",
      "titulo": "String",
      "descripcion": "String",
      "metadatos": { "llave": "valor" }
    }
  ],
  "entradasConocimiento": [
    {
      "tipo": "ENUM: REGLA_NEGOCIO | RESOLUCION_HALLAZGO | CONTEXTO_OPERATIVO | PRECEDENTE_CONTABLE | DOCUMENTO_FUENTE",
      "titulo": "String",
      "contenido": "String (DEBE ESTAR FORMATEADO EN MARKDOWN: Usa viñetas `-`, negritas `**` para resaltar valores clave o alertas, e incluye al menos dos o tres párrafos o saltos de línea `\\n\\n` separados por contexto para facilitar la lectura. Nunca entregues un solo bloque de texto gigante)",
      "metadatos": { "llave": "valor" }
    }
  ],
  "auditLogs": [
    {
      "accion": "String",
      "entidad": "String",
      "entidadId": "String",
      "cambios": { "estadoAnterior": "String", "nuevoEstado": "String" }
    }
  ],
  "variablesMacroeconomicas": [
    {
      "codigo": "ENUM: SMMLV | IVA | TRM | UVR | IBR | IPC",
      "nombre": "String",
      "periodicidad": "ENUM: ANUAL | MENSUAL | DIARIA",
      "unidad": "String",
      "fuenteOficial": "String",
      "valoresHistoricosVariable": [
        {
          "valor": "Number",
          "vigenciaDesde": "YYYY-MM-DD",
          "vigenciaHasta": "YYYY-MM-DD",
          "normaLegal": "String"
        }
      ]
    }
  ],
  "enumsSugeridos": [
    {
      "campo": "String (ej: 'reglasComision.tipo')",
      "valorActualUsado": "String (el ENUM existente que usaste, ej: 'OTRA')",
      "valorPropuesto": "String (ej: 'COMISION_AVALUO')",
      "justificacion": "String (ej: 'El contrato define comisión por avalúo del inmueble, no encaja en categorías existentes')",
      "frecuenciaDetectada": "Number (cuántas veces lo encontró en este análisis)"
    }
  ]
}
```

**[HASTA AQUÍ]**

## 3. Próximos pasos
1. Ejecuta este prompt para los 5 fideicomisos y guarda los archivos `.json` resultantes en `data/json_extraidos/`.
2. Una vez que los tengas listos, avísame. Yo crearé el script para inyectar estos archivos directamente en PostgreSQL a través de Prisma.
