import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:4000/api/v1';
const ADMIN_USER_ID = 'dc6c32d8-50e2-4440-b1b0-7e93d51067f1';
const DELTA_IMPACTO = 1000000; // $1,000,000 per modified finding

async function fetchAllHallazgos() {
  const res = await fetch(`${BASE_URL}/hallazgos?limit=1000`);
  const data: any = await res.json();
  return Array.isArray(data.data) ? data.data : data.data?.data || [];
}

async function fetchRevenueForFideicomiso(fid: string) {
  const res = await fetch(`${BASE_URL}/revenue/opportunities?fideicomisoId=${fid}`);
  const data: any = await res.json();
  return data.meta?.totalPotencial || 0;
}

async function fetchStatsForFideicomiso(fid: string) {
  const res = await fetch(`${BASE_URL}/fideicomisos/${fid}/hallazgos?limit=1000`);
  const data: any = await res.json();
  const list = Array.isArray(data.data) ? data.data : data.data?.data || [];
  return {
    total: list.length,
    criticos: list.filter((h: any) => h.severidad === 'CRITICO').length,
  };
}

async function mutateHallazgo(id: string, originalImpacto: number) {
  // 1. Aumentar impacto y cambiar severidad a CRITICO
  const patchRes = await fetch(`${BASE_URL}/hallazgos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cambios: {
        impactoEconomico: (originalImpacto || 0) + DELTA_IMPACTO,
        severidad: 'CRITICO',
        validacion: 'CONFIRMADO',
      },
      justificacion: 'Exhaustive Test: Mutación automática masiva',
      userId: ADMIN_USER_ID,
    }),
  });
  if (!patchRes.ok) throw new Error(`Patch falló ID ${id}`);

  // 2. Agregar comentario
  const commentRes = await fetch(`${BASE_URL}/hallazgos/${id}/comentarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contenido: 'Comentario automático de stress test',
      tipo: 'COMENTARIO',
      userId: ADMIN_USER_ID,
    }),
  });
  if (!commentRes.ok) throw new Error(`Comment falló ID ${id}`);
}

async function verifyHistory(id: string) {
  const res = await fetch(`${BASE_URL}/hallazgos/${id}/historial`);
  const histData: any = await res.json();
  const rawData = histData.data?.data || histData.data || histData;
  const history = Array.isArray(rawData) ? rawData : [];
  
  const types = history.map((h: any) => h.tipo || h.type);
  const pass = 
    types.includes('CAMBIO_IMPACTO_ECONOMICO') &&
    types.includes('CAMBIO_SEVERIDAD') &&
    types.includes('CAMBIO_VALIDACION') &&
    types.includes('COMENTARIO');
    
  return { pass, eventCount: history.length, types };
}

async function main() {
  console.log('🚀 Iniciando Test Exhaustivo de Estrés (30% mutación por Fideicomiso)...\n');
  const report: string[] = [];
  report.push('# Reporte de Test Exhaustivo de Bitácora y KPIs\n');
  report.push(`*Fecha de ejecución:* ${new Date().toISOString()}\n`);

  const hallazgos = await fetchAllHallazgos();
  
  if (hallazgos.length === 0) {
    throw new Error('No hay hallazgos disponibles. Ejecuta el db:seed.');
  }

  // Agrupar por fideicomisoId
  const byFid: Record<string, any[]> = {};
  for (const h of hallazgos) {
    if (!byFid[h.fideicomisoId]) byFid[h.fideicomisoId] = [];
    byFid[h.fideicomisoId].push(h);
  }

  console.log(`Encontrados ${hallazgos.length} hallazgos distribuidos en ${Object.keys(byFid).length} fideicomisos.\n`);
  report.push(`**Total Fideicomisos probados**: ${Object.keys(byFid).length}`);
  report.push(`**Total Hallazgos globales**: ${hallazgos.length}\n`);

  let globalSuccess = true;
  let totalMutated = 0;

  for (const [fid, list] of Object.entries(byFid)) {
    const fidName = list[0]?.fideicomiso?.codigoPrincipal || fid;
    const targetCount = Math.max(1, Math.ceil(list.length * 0.3));
    report.push(`## Fideicomiso: ${fidName}`);
    report.push(`- **Total Hallazgos**: ${list.length}`);
    report.push(`- **Hallazgos a mutar (30%)**: ${targetCount}`);

    console.log(`\n➡️ Fideicomiso [${fidName}]: Modificando ${targetCount}/${list.length} hallazgos...`);

    // 1. Capturar Línea Base
    const baselineRevenue = await fetchRevenueForFideicomiso(fid);
    const baselineStats = await fetchStatsForFideicomiso(fid);

    // 2. Seleccionar targets y mutar concurrentemente
    // Evitar elegir los que ya son CRITICO si es posible, para ver el delta limpio.
    let eligible = list.filter(h => h.severidad !== 'CRITICO');
    if (eligible.length < targetCount) eligible = list; // Fallback
    
    // Shuffle and pick
    const targets = eligible.sort(() => 0.5 - Math.random()).slice(0, targetCount);
    
    const mutationPromises = targets.map((t: any) => mutateHallazgo(t.id, t.impactoEconomico || 0));
    const results = await Promise.allSettled(mutationPromises);
    
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
       console.error(`❌ Fallaron ${failures.length} mutaciones en ${fidName}:`, failures);
       report.push(`- ❌ **ERROR**: Fallaron ${failures.length} mutaciones de red.`);
       globalSuccess = false;
       continue;
    }

    totalMutated += targets.length;

    // 3. Verificar KPIs
    const newRevenue = await fetchRevenueForFideicomiso(fid);
    const newStats = await fetchStatsForFideicomiso(fid);

    // Excluyendo los que ya eran CRITICO
    const expectedCriticosDelta = targets.filter((t: any) => t.severidad !== 'CRITICO').length;
    const expectedRevenueDelta = targets.length * DELTA_IMPACTO;

    const actualCriticosDelta = newStats.criticos - baselineStats.criticos;
    const actualRevenueDelta = newRevenue - baselineRevenue;

    const kpiPass = (actualCriticosDelta === expectedCriticosDelta) && (actualRevenueDelta === expectedRevenueDelta);
    
    report.push(`### Resultados de Propagación de KPIs`);
    report.push(`- **Delta Críticos Esperado**: +${expectedCriticosDelta} | **Real**: +${actualCriticosDelta} ${actualCriticosDelta === expectedCriticosDelta ? '✅' : '❌'}`);
    report.push(`- **Delta Revenue Esperado**: +$${expectedRevenueDelta.toLocaleString()} | **Real**: +$${actualRevenueDelta.toLocaleString()} ${actualRevenueDelta === expectedRevenueDelta ? '✅' : '❌'}`);

    if (kpiPass) console.log(`   ✅ KPIs propagados exactamente.`);
    else {
      console.error(`   ❌ Fallo en propagación de KPIs para ${fidName}`);
      globalSuccess = false;
    }

    // 4. Verificar Trazabilidad en Bitácora (Concurrency test)
    let historyPassCount = 0;
    for (const t of targets) {
      const hist = await verifyHistory(t.id);
      if (hist.pass) historyPassCount++;
    }

    report.push(`### Resultados de Trazabilidad (Auditoría)`);
    report.push(`- **Hallazgos con huella de auditoría 100% perfecta**: ${historyPassCount}/${targets.length} ${historyPassCount === targets.length ? '✅' : '❌'}\n`);

    if (historyPassCount === targets.length) {
       console.log(`   ✅ Trazabilidad perfecta en ${targets.length} hallazgos (Git-style comprobado).`);
    } else {
       console.error(`   ❌ Fallo en trazabilidad. Bitácoras incompletas.`);
       globalSuccess = false;
    }
  }

  // Final Summary
  report.unshift(`\n**Resultado Global:** ${globalSuccess ? '✅ ÉXITO ABSOLUTO' : '❌ SE ENCONTRARON FALLOS'}`);
  report.unshift(`**Total hallazgos mutados:** ${totalMutated}`);

  const reportPath = path.resolve(__dirname, 'exhaustive_report.md');
  fs.writeFileSync(reportPath, report.join('\n'));

  console.log(`\n=============================================================`);
  console.log(`🏁 TEST EXHAUSTIVO FINALIZADO. Global Success: ${globalSuccess}`);
  console.log(`📄 Reporte escrito en: ${reportPath}`);
  console.log(`🧹 Iniciando limpieza de base de datos...`);
  
  execSync('pnpm run db:reset-hallazgos', { stdio: 'inherit', cwd: path.resolve(__dirname, '../../..') });
  console.log(`✅ Base de datos restaurada al seed inicial impecablemente.`);
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL EXHAUSTIVE TEST:', err.message);
  process.exit(1);
});
