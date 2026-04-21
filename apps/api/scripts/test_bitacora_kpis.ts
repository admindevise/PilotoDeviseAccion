import { execSync } from 'child_process';
import * as path from 'path';

const BASE_URL = 'http://localhost:4000/api/v1';
const ADMIN_USER_ID = 'dc6c32d8-50e2-4440-b1b0-7e93d51067f1';

async function fetchRevenuePotencial() {
  const res = await fetch(`${BASE_URL}/revenue/opportunities`);
  const data: any = await res.json();
  return data.meta.totalPotencial;
}

async function fetchHallazgosStats() {
  const res = await fetch(`${BASE_URL}/hallazgos`);
  const data: any = await res.json();
  const list = Array.isArray(data.data) ? data.data : data.data?.data || [];
  
  const stats = {
    total: data.meta?.total || list.length,
    criticos: list.filter((h: any) => h.severidad === 'CRITICO').length,
    abiertos: list.filter((h: any) => h.estado === 'ABIERTO').length,
  };
  return { stats, list };
}

async function patchHallazgo(id: string, cambios: any, justificacion: string) {
  const res = await fetch(`${BASE_URL}/hallazgos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cambios,
      justificacion,
      userId: ADMIN_USER_ID,
    }),
  });
  if (!res.ok) throw new Error(`PATCH falló con status ${res.status}`);
  return res.json();
}

async function resolveHallazgo(id: string) {
  const res = await fetch(`${BASE_URL}/hallazgos/${id}/resoluciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: 'RESUELTO_CON_EXPLICACION',
      explicacion: 'Stress test resolution',
      resueltoPorId: ADMIN_USER_ID,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RESOLVE falló con status ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('================================================================');
  console.log('🛡️  INICIANDO STRESS TEST END-TO-END DE BITÁCORA Y KPIs');
  console.log('================================================================\n');

  // 1. BASELINE
  console.log('📊 1. Capturando línea base (Baseline)...');
  const initialRevenue = await fetchRevenuePotencial();
  const { stats: initialStats, list: hallazgos } = await fetchHallazgosStats();
  
  console.log(`   - Revenue Potencial Inicial: $${initialRevenue.toLocaleString()}`);
  console.log(`   - Total Hallazgos: ${initialStats.total}`);
  console.log(`   - Hallazgos Críticos: ${initialStats.criticos}`);
  console.log(`   - Hallazgos Abiertos: ${initialStats.abiertos}`);

  if (hallazgos.length === 0) {
    throw new Error('No hay hallazgos para probar. Ejecuta el seed primero.');
  }

  // Find a target to modify that is not CRITICO
  const target = hallazgos.find((h: any) => h.severidad !== 'CRITICO' && h.estado === 'ABIERTO');
  if (!target) throw new Error('No target hallazgo found for test.');

  const originalImpacto = target.impactoEconomico || 0;
  const DELTA_IMPACTO = 50000000; // 50 millones
  const newImpacto = originalImpacto + DELTA_IMPACTO;

  console.log(`\n🎯 2. Objetivo seleccionado: ID ${target.id} (${target.titulo})`);
  console.log(`   - Impacto original: $${originalImpacto.toLocaleString()}`);
  console.log(`   - Severidad original: ${target.severidad}`);

  // 2. MODIFY FIELDS AND TEST KPI PROPAGATION
  console.log('\n🔄 3. Aplicando mutaciones (Impacto + Severidad)...');
  await patchHallazgo(target.id, {
    impactoEconomico: newImpacto,
    severidad: 'CRITICO'
  }, 'E2E Test: Aumentando impacto y severidad artificialmente');

  console.log('\n📈 4. Verificando propagación a KPIs...');
  const updatedRevenue = await fetchRevenuePotencial();
  const { stats: updatedStats } = await fetchHallazgosStats();

  console.log(`   - Nuevo Revenue Potencial: $${updatedRevenue.toLocaleString()}`);
  const revenueDiff = updatedRevenue - initialRevenue;
  console.log(`   - Delta Revenue esperado: $${DELTA_IMPACTO.toLocaleString()}`);
  console.log(`   - Delta Revenue real: $${revenueDiff.toLocaleString()}`);
  
  if (revenueDiff !== DELTA_IMPACTO) {
    console.error('❌ FALLO: El Revenue no se propagó correctamente.');
  } else {
    console.log('   ✅ ÉXITO: El Revenue Potencial refleja el cambio en tiempo real.');
  }

  const criticosDiff = updatedStats.criticos - initialStats.criticos;
  if (criticosDiff !== 1) {
    console.error(`❌ FALLO: Esperaba +1 Crítico, obtuve +${criticosDiff}`);
  } else {
    console.log('   ✅ ÉXITO: El contador de hallazgos críticos se actualizó correctamente.');
  }

  // 3. STRESS TEST CONCURRENT REQUESTS
  console.log('\n🌪️  5. Stress Test: Disparando modificaciones concurrentes a la bitácora...');
  const promises = [];
  
  // Send 5 concurrent updates to descriptions, category, and comments
  for (let i = 0; i < 5; i++) {
    promises.push(
      patchHallazgo(target.id, { area: 'LEGAL' }, `Concurrent test update ${i}`)
    );
  }
  // Also send a resolution concurrently
  promises.push(resolveHallazgo(target.id));

  const results = await Promise.allSettled(promises);
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error('❌ FALLO en peticiones concurrentes:', failures);
    throw new Error('Fallaron algunas promesas concurrentes.');
  }
  console.log('   ✅ ÉXITO: 6 peticiones concurrentes procesadas sin errores HTTP.');

  // 4. VERIFY TRACEABILITY (BITÁCORA HISTORY)
  console.log('\n🔍 6. Verificando trazabilidad e historia (Prueba de Auditoría)...');
  const histRes = await fetch(`${BASE_URL}/hallazgos/${target.id}/historial`);
  const histData: any = await histRes.json();
  const rawData = histData.data?.data || histData.data || histData;
  const history = Array.isArray(rawData) ? rawData : [];

  console.log(`   - Object shape: keys=${Object.keys(histData).join(',')}, isArray=${Array.isArray(rawData)}`);
  console.log(`   - Eventos en historial encontrados: ${history.length}`);
  
  const types = history.map((h: any) => h.tipo || h.type);
  console.log('   - Event types found:', types.join(', '));
  
  const hasImpactoCambio = types.includes('CAMBIO_IMPACTO_ECONOMICO');
  const hasSeveridadCambio = types.includes('CAMBIO_SEVERIDAD');
  const hasResolucion = types.includes('RESOLUCION') || types.includes('RESOLUCION_CREADA');

  if (hasImpactoCambio && hasSeveridadCambio && hasResolucion) {
    console.log('   ✅ ÉXITO: La bitácora ha registrado la huella de auditoría exacta de todos los eventos (Git-style history comprobado).');
  } else {
    console.error('❌ FALLO: Faltan tipos de eventos esperados en el historial.');
  }

  // 5. RESTORE DB
  console.log('\n🧹 7. Restaurando base de datos a estado original...');
  try {
    execSync('pnpm run db:reset-hallazgos', { stdio: 'inherit', cwd: path.resolve(__dirname, '../../..') });
    console.log('\n✅ Base de datos restaurada correctamente tras las pruebas.');
  } catch (err) {
    console.error('❌ Error restaurando DB:', err);
  }

  console.log('\n================================================================');
  console.log('🏁 STRESS TEST COMPLETADO');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL DURANTE STRESS TEST:', err.message);
  process.exit(1);
});
