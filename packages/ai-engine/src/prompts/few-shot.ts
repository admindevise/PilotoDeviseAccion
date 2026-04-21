/**
 * Few-shot examples for contract commission extraction.
 *
 * Each example contains a representative contract clause and the expected
 * structured JSON output.  These are injected into the contract-extractor
 * agent prompt so the model learns the expected format by example.
 */
export const FEW_SHOT_EXTRACTION_EXAMPLES = `
### Ejemplo 1 – Administración mensual indexada a SMMLV

**Cláusula contractual:**
"CLÁUSULA QUINTA – REMUNERACIÓN: El fideicomitente pagará a la sociedad fiduciaria, a título de comisión por la administración del patrimonio autónomo, el equivalente a dos punto cinco (2.5) Salarios Mínimos Mensuales Legales Vigentes (SMMLV) más el Impuesto al Valor Agregado (IVA), pagaderos dentro de los primeros cinco (5) días hábiles de cada mes calendario."

**Resultado esperado:**
\`\`\`json
{
  "tipo": "ADMINISTRACION_MENSUAL",
  "nombre": "Comisión de administración mensual",
  "formula": "2.5 × SMMLV + IVA",
  "formulaDetalle": {
    "base": "SMMLV",
    "multiplicador": 2.5,
    "tipo": "fijo",
    "condiciones": "Pagadera dentro de los primeros 5 días hábiles de cada mes"
  },
  "periodicidad": "MENSUAL",
  "condiciones": "Pagadera dentro de los primeros 5 días hábiles de cada mes calendario",
  "clausulaFuente": "CLÁUSULA QUINTA – REMUNERACIÓN",
  "confianzaExtraccion": 0.95,
  "notaRevision": null
}
\`\`\`

---

### Ejemplo 2 – Comisión inicial de estructuración

**Cláusula contractual:**
"PARÁGRAFO SEGUNDO: Por concepto de la estructuración y constitución del presente patrimonio autónomo, el fideicomitente pagará a la fiduciaria una comisión única equivalente a quince (15) SMMLV más IVA, la cual deberá cancelarse dentro de los treinta (30) días siguientes a la fecha de perfeccionamiento de este contrato."

**Resultado esperado:**
\`\`\`json
{
  "tipo": "INICIAL_ESTRUCTURACION",
  "nombre": "Comisión de estructuración y constitución",
  "formula": "15 × SMMLV + IVA",
  "formulaDetalle": {
    "base": "SMMLV",
    "multiplicador": 15,
    "tipo": "fijo",
    "condiciones": "Pagadera dentro de los 30 días siguientes al perfeccionamiento"
  },
  "periodicidad": "UNICA",
  "condiciones": "Pagadera dentro de los 30 días siguientes a la fecha de perfeccionamiento del contrato",
  "clausulaFuente": "PARÁGRAFO SEGUNDO",
  "confianzaExtraccion": 0.92,
  "notaRevision": null
}
\`\`\`

---

### Ejemplo 3 – Cesión de derechos fiduciarios

**Cláusula contractual:**
"CLÁUSULA DÉCIMA – CESIONES: Cada operación de cesión de derechos fiduciarios causará a favor de la fiduciaria una comisión equivalente a un (1) SMMLV más IVA, a cargo del cesionario."

**Resultado esperado:**
\`\`\`json
{
  "tipo": "CESION_DERECHOS",
  "nombre": "Comisión por cesión de derechos fiduciarios",
  "formula": "1 × SMMLV + IVA",
  "formulaDetalle": {
    "base": "SMMLV",
    "multiplicador": 1,
    "tipo": "fijo",
    "condiciones": "A cargo del cesionario"
  },
  "periodicidad": "POR_EVENTO",
  "condiciones": "Por cada operación de cesión, a cargo del cesionario",
  "clausulaFuente": "CLÁUSULA DÉCIMA – CESIONES",
  "confianzaExtraccion": 0.93,
  "notaRevision": null
}
\`\`\`

---

### Ejemplo 4 – Comisión variable por monetización

**Cláusula contractual:**
"CLÁUSULA SEXTA – COMISIÓN VARIABLE: Adicionalmente, la sociedad fiduciaria recibirá una comisión variable equivalente al cero punto uno por ciento (0.1%) del valor total recaudado por concepto de ventas del proyecto, liquidada y pagadera trimestralmente, más el IVA correspondiente. En todo caso, la comisión variable mensual no será inferior a un (1) SMMLV más IVA."

**Resultado esperado:**
\`\`\`json
{
  "tipo": "VARIABLE_MONETIZACION",
  "nombre": "Comisión variable por monetización de ventas",
  "formula": "max(0.1% × valor_recaudado, 1 × SMMLV) + IVA",
  "formulaDetalle": {
    "base": "valor_recaudado",
    "multiplicador": 0.001,
    "tipo": "mayor_entre",
    "condiciones": "Mínimo 1 SMMLV mensual"
  },
  "periodicidad": "TRIMESTRAL",
  "condiciones": "Liquidada trimestralmente. Mínimo mensual: 1 SMMLV + IVA",
  "clausulaFuente": "CLÁUSULA SEXTA – COMISIÓN VARIABLE",
  "confianzaExtraccion": 0.88,
  "notaRevision": "Fórmula tiene componente de mínimo garantizado. Verificar interpretación del mínimo mensual vs. trimestral."
}
\`\`\`

---

### Ejemplo 5 – Suscripción de otrosí

**Cláusula contractual:**
"CLÁUSULA OCTAVA – MODIFICACIONES: La suscripción de cualquier otrosí o documento modificatorio del presente contrato generará a favor de la fiduciaria una comisión equivalente a uno punto cinco (1.5) SMMLV más IVA."

**Resultado esperado:**
\`\`\`json
{
  "tipo": "SUSCRIPCION_OTROSI",
  "nombre": "Comisión por suscripción de otrosí",
  "formula": "1.5 × SMMLV + IVA",
  "formulaDetalle": {
    "base": "SMMLV",
    "multiplicador": 1.5,
    "tipo": "fijo",
    "condiciones": null
  },
  "periodicidad": "POR_EVENTO",
  "condiciones": "Por cada otrosí o documento modificatorio suscrito",
  "clausulaFuente": "CLÁUSULA OCTAVA – MODIFICACIONES",
  "confianzaExtraccion": 0.94,
  "notaRevision": null
}
\`\`\`

---

### Ejemplo 6 – Asistencia a comité fiduciario

**Cláusula contractual:**
"La fiduciaria asistirá al comité fiduciario mensual. Por cada sesión a la que asista un representante de la fiduciaria, se causará una comisión de cero punto cinco (0.5) SMMLV más IVA, con un máximo de doce (12) sesiones al año."

**Resultado esperado:**
\`\`\`json
{
  "tipo": "ASISTENCIA_COMITE",
  "nombre": "Comisión por asistencia a comité fiduciario",
  "formula": "0.5 × SMMLV + IVA (max 12 sesiones/año)",
  "formulaDetalle": {
    "base": "SMMLV",
    "multiplicador": 0.5,
    "tipo": "fijo",
    "condiciones": "Máximo 12 sesiones al año"
  },
  "periodicidad": "POR_EVENTO",
  "condiciones": "Por cada sesión del comité fiduciario. Máximo 12 sesiones al año.",
  "clausulaFuente": "Cláusula de asistencia a comité (no numerada)",
  "confianzaExtraccion": 0.90,
  "notaRevision": "La cláusula no tiene numeración formal. Verificar ubicación exacta en el contrato."
}
\`\`\`

---

### Ejemplo 7 – Cláusula ambigua (confianza baja)

**Cláusula contractual:**
"Se reconocerán las comisiones que correspondan según la normativa y prácticas vigentes para este tipo de operaciones."

**Resultado esperado:**
\`\`\`json
{
  "tipo": "OTRA",
  "nombre": "Comisión genérica referida a normativa vigente",
  "formula": "No especificada",
  "formulaDetalle": {
    "base": "No especificada",
    "multiplicador": 0,
    "tipo": "fijo",
    "condiciones": "Referencia genérica a normativa y prácticas vigentes"
  },
  "periodicidad": "MENSUAL",
  "condiciones": "Sin detalle de fórmula ni periodicidad específica",
  "clausulaFuente": "Cláusula genérica (sin referencia exacta)",
  "confianzaExtraccion": 0.35,
  "notaRevision": "ATENCIÓN: Cláusula extremadamente ambigua. No especifica tipo, monto ni periodicidad. Requiere revisión manual obligatoria."
}
\`\`\`
`.trim();
