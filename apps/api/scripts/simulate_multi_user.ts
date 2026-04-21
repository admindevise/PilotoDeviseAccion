import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:4000/api/v1';

// Real users from the DB
const USERS = [
  { id: 'dc6c32d8-50e2-4440-b1b0-7e93d51067f1', name: 'Administrador DIS', role: 'ADMIN' },
  { id: 'a9cfc99c-df9c-470e-aa6c-fbe17b45dd74', name: 'Gerente de Fideicomiso', role: 'GERENTE' },
  { id: '6b5cd6cd-22a9-4780-a5a8-0ba16f93f5c6', name: 'Analista Contable', role: 'ANALISTA' }
];

async function fetchAllHallazgos() {
  const res = await fetch(`${BASE_URL}/hallazgos?limit=1000`);
  const data: any = await res.json();
  return Array.isArray(data.data) ? data.data : data.data?.data || [];
}

function getRandomUser() {
  return USERS[Math.floor(Math.random() * USERS.length)];
}

async function mutacionCompleja(hallazgo: any) {
  const originalImpacto = hallazgo.impactoEconomico || 0;
  
  // Array of possible changes to trigger different audit logs
  const possibleMutations = [
    async () => {
      const user = getRandomUser();
      console.log(`   [${user.name}] -> Cambiando Severidad a CRITICO...`);
      await fetch(`${BASE_URL}/hallazgos/${hallazgo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cambios: { severidad: 'CRITICO' },
          justificacion: 'Revisión urgente solicitada por Gerencia',
          userId: user.id,
        })
      });
    },
    async () => {
      const user = getRandomUser();
      const delta = Math.floor(Math.random() * 5000000) + 1000000;
      console.log(`   [${user.name}] -> Ajustando Impacto Económico (+${delta.toLocaleString()})...`);
      await fetch(`${BASE_URL}/hallazgos/${hallazgo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cambios: { impactoEconomico: originalImpacto + delta },
          justificacion: 'Ajuste matemático tras cruce con extractos oficiales',
          userId: user.id,
        })
      });
    },
    async () => {
      const user = getRandomUser();
      console.log(`   [${user.name}] -> Validando Hallazgo (Parcialmente Confirmado)...`);
      await fetch(`${BASE_URL}/hallazgos/${hallazgo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cambios: { validacion: 'PARCIALMENTE_CONFIRMADO' },
          justificacion: 'Se confirma la omisión pero el monto exacto difiere',
          userId: user.id,
        })
      });
    },
    async () => {
      const user = getRandomUser();
      console.log(`   [${user.name}] -> Cambiando Categoría a LEGAL...`);
      await fetch(`${BASE_URL}/hallazgos/${hallazgo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cambios: { area: 'LEGAL' },
          justificacion: 'Reasignado a Jurídico para emisión de concepto',
          userId: user.id,
        })
      });
    },
    async () => {
      const user = getRandomUser();
      console.log(`   [${user.name}] -> Añadiendo Nota de Gestión...`);
      await fetch(`${BASE_URL}/hallazgos/${hallazgo.id}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenido: `Por favor revisar el contrato de adhesión antes de proceder. Atte: ${user.name}`,
          tipo: 'NOTA_GESTION',
          userId: user.id,
        })
      });
    },
    async () => {
      const user = getRandomUser();
      const rating = Math.floor(Math.random() * 3) + 3; // 3 to 5 stars
      console.log(`   [${user.name}] -> Calificando motor IA con ${rating} estrellas...`);
      await fetch(`${BASE_URL}/hallazgos/${hallazgo.id}/confianza-ia`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confianzaIA: rating,
          notasRevisor: 'Buena detección pero falló en mapear la cuenta contable exacta.',
          userId: user.id,
        })
      });
    }
  ];

  // Pick 2-4 random mutations for this finding
  const numMutations = Math.floor(Math.random() * 3) + 2;
  const selectedMutations = possibleMutations.sort(() => 0.5 - Math.random()).slice(0, numMutations);
  
  // Ejecutar secuencialmente para que quede una linda historia en la UI
  for (const mut of selectedMutations) {
    await mut();
    // sleep tiny bit to ensure chronological ordering in db
    await new Promise(r => setTimeout(r, 200)); 
  }
}

async function main() {
  console.log('====================================================================');
  console.log('🎭 INICIANDO SIMULACIÓN MULTI-USUARIO (SIN AUTO-RESET)');
  console.log('====================================================================\n');

  console.log('⚠️ NOTA: Este script NO borrará la base de datos al final.');
  console.log('   Los hallazgos quedarán mutados para que puedas visualizarlos en el frontend.\n');

  let hallazgos = await fetchAllHallazgos();
  
  if (hallazgos.length === 0) {
    console.log('No hay hallazgos disponibles. Ejecutando reset inicial primero para poblar...');
    execSync('pnpm run db:reset-hallazgos', { stdio: 'ignore', cwd: path.resolve(__dirname, '../../..') });
    hallazgos = await fetchAllHallazgos();
  }

  // Agrupar por fideicomisoId
  const byFid: Record<string, any[]> = {};
  for (const h of hallazgos) {
    if (!byFid[h.fideicomisoId]) byFid[h.fideicomisoId] = [];
    byFid[h.fideicomisoId].push(h);
  }

  let totalMutated = 0;

  for (const [fid, list] of Object.entries(byFid)) {
    const fidName = list[0]?.fideicomiso?.codigoPrincipal || fid;
    // Mutate ~40% for rich UI visualization
    const targetCount = Math.max(1, Math.ceil(list.length * 0.4));
    console.log(`\n🏢 Fideicomiso [${fidName}]: Modificando ${targetCount} hallazgos...`);

    const targets = list.sort(() => 0.5 - Math.random()).slice(0, targetCount);
    
    for (const h of targets) {
      console.log(`\n 📍 Hallazgo: ${h.titulo.substring(0, 50)}... [ID: ${h.id.split('-')[0]}]`);
      await mutacionCompleja(h);
      totalMutated++;
    }
  }

  console.log(`\n====================================================================`);
  console.log(`✅ SIMULACIÓN EXITOSA`);
  console.log(`   - Se inyectaron historias de auditoría ricas en ${totalMutated} hallazgos.`);
  console.log(`   - Simulados ${USERS.length} usuarios distintos (Admin, Gerente, Analista).`);
  console.log(`   - Base de datos intacta (NO se reseteó).`);
  console.log(`\n👉 Ve a tu frontend (http://localhost:3000/hallazgos) para ver la Bitácora unificada con los diferentes actores y colores.`);
  console.log(`====================================================================`);
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL EXHAUSTIVE TEST:', err.message);
  process.exit(1);
});
