/**
 * Colombian fiduciary commission taxonomy.
 *
 * This constant is injected into agent system prompts so the LLM has a
 * structured understanding of every commission type commonly found in
 * Colombian trust (fideicomiso) agreements.
 */
export const COMMISSION_TAXONOMY = `
## Taxonomía de Comisiones Fiduciarias - Colombia

### 1. ADMINISTRACION_MENSUAL
- **Descripción**: Comisión periódica por la administración del fideicomiso.
- **Periodicidad**: Mensual (a veces trimestral para patrimonios autónomos pequeños).
- **Cálculo típico**: Factor × SMMLV + IVA. Ejemplo: "2.5 SMMLV mensuales más IVA".
- **Variantes**: Puede expresarse como porcentaje sobre activos bajo administración (AUA).
- **Cuenta PUC típica**: 51151801001 (gasto) o 15203001001 (costo, si se activa).
- **Cláusulas frecuentes**: "Cláusula Quinta – Remuneración", "Honorarios fiduciarios".

### 2. INICIAL_ESTRUCTURACION
- **Descripción**: Comisión única cobrada al constituir el fideicomiso o al estructurar una operación compleja.
- **Periodicidad**: Única.
- **Cálculo típico**: Monto fijo en SMMLV o en pesos constantes. Ejemplo: "15 SMMLV por una sola vez".
- **Variantes**: Puede tener componente variable según complejidad.
- **Cláusula frecuente**: "Por concepto de estructuración y constitución del patrimonio autónomo".

### 3. CESION_DERECHOS
- **Descripción**: Comisión cobrada cada vez que se ceden derechos fiduciarios a un tercero.
- **Periodicidad**: Por evento.
- **Cálculo típico**: Factor fijo × SMMLV por cada cesión. Ejemplo: "1 SMMLV por cada cesión + IVA".
- **Variantes**: Puede incluir topes o descuentos por volumen.
- **Cláusula frecuente**: "Por cada operación de cesión de derechos fiduciarios".

### 4. SUSCRIPCION_OTROSI
- **Descripción**: Comisión cobrada por la suscripción de cada otrosí (enmienda) al contrato.
- **Periodicidad**: Por evento.
- **Cálculo típico**: Factor × SMMLV. Ejemplo: "1.5 SMMLV por cada otrosí suscrito".
- **Variantes**: Puede diferenciarse entre otrosíes mayores y menores.
- **Cláusula frecuente**: "Por cada modificación contractual formalizada mediante otrosí".

### 5. ASISTENCIA_COMITE
- **Descripción**: Comisión por asistencia a comités fiduciarios o de seguimiento.
- **Periodicidad**: Por evento (usualmente mensual o bimensual).
- **Cálculo típico**: Factor × SMMLV por sesión. Ejemplo: "0.5 SMMLV por sesión de comité".
- **Variantes**: Puede incluir topes mensuales, o ser sin costo si está dentro de administración.
- **Cláusula frecuente**: "Asistencia al comité fiduciario" o "comité de seguimiento".

### 6. VARIABLE_MONETIZACION
- **Descripción**: Comisión variable calculada como porcentaje del valor monetizado o recaudado.
- **Periodicidad**: Mensual, trimestral o por evento, según contrato.
- **Cálculo típico**: Porcentaje × valor recaudado. Ejemplo: "0.1% del valor recaudado + IVA".
- **Variantes**: Puede incluir mínimos garantizados o escalonamiento por tramos.
- **Cláusula frecuente**: "Comisión variable por monetización" o "por recaudo".

### 7. COMISION_FONDOS
- **Descripción**: Comisión asociada a la gestión de fondos de inversión colectiva dentro del fideicomiso.
- **Periodicidad**: Diaria (se liquida mensual).
- **Cálculo típico**: Porcentaje anual sobre activos netos del fondo (e.g., 0.80% E.A.).
- **Variantes**: Puede incluir comisión de éxito.
- **Cláusula frecuente**: "Comisión de administración del fondo" o "FIC".

### 8. ACOMPANAMIENTO_PROCESAL
- **Descripción**: Comisión por acompañamiento jurídico o gestión de procesos judiciales asociados al fideicomiso.
- **Periodicidad**: Por evento o mensual.
- **Cálculo típico**: Factor × SMMLV o tarifa fija mensual.
- **Variantes**: Puede ser condicional a la existencia de procesos activos.
- **Cláusula frecuente**: "Acompañamiento en procesos judiciales" o "gestión procesal".

### 9. PRORROGA
- **Descripción**: Comisión cobrada al prorrogar la vigencia del contrato de fiducia.
- **Periodicidad**: Única por cada prórroga.
- **Cálculo típico**: Porcentaje de la comisión de administración anual o factor × SMMLV.
- **Variantes**: Puede ser automática si el contrato tiene cláusula de renovación tácita.
- **Cláusula frecuente**: "En caso de prórroga del presente contrato" o "renovación".

### 10. OTRA
- **Descripción**: Cualquier comisión no clasificable en las categorías anteriores.
- **Variantes**: Gastos reembolsables, comisiones por certificaciones, expedición de estados de cuenta extraordinarios, etc.

---

### Variables macroeconómicas frecuentes
- **SMMLV**: Salario Mínimo Mensual Legal Vigente (actualizado anualmente por decreto).
- **IPC**: Índice de Precios al Consumidor (ajuste anual).
- **DTF**: Tasa de captación a 90 días (referencia de rendimiento).
- **IVA**: Impuesto al Valor Agregado (actualmente 19% en Colombia).

### Patrones de fórmula comunes
- \`{factor} × SMMLV + IVA\` — Comisiones fijas indexadas al salario mínimo.
- \`{porcentaje}% × {base} + IVA\` — Comisiones variables.
- \`max({opcion_a}, {opcion_b})\` — "El mayor entre" dos opciones.
- \`{monto_fijo} COP + IVA\` — Comisiones en pesos constantes.
`.trim();
