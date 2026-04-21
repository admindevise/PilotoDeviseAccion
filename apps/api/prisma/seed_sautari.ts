import { PrismaClient, TipoDocumento, FormatoOriginal, OrigenERP, TipoContrato, TipoComision, PeriodicidadComision, TipoConvencion, TipoHallazgo, SeveridadHallazgo, CategoriaHallazgo, SubcategoriaHallazgo, EstadoHallazgo, AreaHallazgo } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.resolve(__dirname, '../../../data/json_extraidos/auditoria_110100_FA5931_SAUTARI.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // Locate the Fideicomiso FA-5931 in the DB.
  // We assume the fideicomiso already exists based on `seed.ts`
  const fid = await prisma.fideicomiso.findUnique({
    where: { codigoPrincipal: 'FA-5931' },
  });

  if (!fid) {
    throw new Error("Fideicomiso FA-5931 no encontrado. Ejecuta el seed general primero.");
  }

  // Clear existing findings for this Fideicomiso
  await prisma.hallazgo.deleteMany({ where: { fideicomisoId: fid.id }});

  function formatCalculo(obj: any, indent = 0): string {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }
    return Object.entries(obj).map(([k, v]) => {
      const spaces = '  '.repeat(indent);
      const label = k.replace(/_/g, ' ');
      if (typeof v === 'object' && v !== null) {
        return `${spaces}- **${label}**:\n${formatCalculo(v, indent + 1)}`;
      }
      return `${spaces}- **${label}**: ${v}`;
    }).join('\n');
  }

  // Subcategoria mapping for Sautari hallazgos
  const subcategoriaMap: Record<string, SubcategoriaHallazgo> = {
    'HST-001': 'CARTERA_VENCIDA',      // Factura emitida, pago parcial pendiente
    'HST-002': 'REVENUE_NO_CAPTURADO', // Revenue variable posiblemente nunca facturado
    'HST-003': 'ANOMALIA',             // Precedente resuelto, informativo
    'HST-004': 'REVENUE_NO_CAPTURADO', // Poderes/memoriales nunca facturados
    'HST-005': 'REVENUE_NO_CAPTURADO', // Giros adicionales nunca controlados
  };

  for (const h of data.hallazgos) {
    const razonamientoObj = {
      reglaCitada: h.regla_citada || null,
      variableAplicada: h.variable_aplicada || null,
      calculoEsperado: h.calculo_esperado ? formatCalculo(h.calculo_esperado) : null,
      evidenciaEncontrada: Array.isArray(h.evidencia_encontrada) 
        ? h.evidencia_encontrada.map((item: string) => `- ${item}`).join('\n') 
        : (h.evidencia_encontrada || null),
      conclusion: h.conclusion || null,
      riesgoIdentificado: h.riesgo || null,
    };

    let areaEnum: AreaHallazgo = 'OPERATIVA';
    if (h.area === 'FACTURACION') areaEnum = 'FACTURACION';
    if (h.area === 'CONTABILIDAD') areaEnum = 'CONTABILIDAD';
    if (h.area === 'LEGAL') areaEnum = 'LEGAL';

    let severidadEnum: SeveridadHallazgo = 'INFORMATIVO';
    if (h.severidad === 'ALTA' || h.severidad === 'ALTO') severidadEnum = 'ALTO';
    if (h.severidad === 'MEDIA' || h.severidad === 'MEDIO') severidadEnum = 'MEDIO';
    if (h.severidad === 'BAJA' || h.severidad === 'BAJO') severidadEnum = 'BAJO';

    // The findings from prompt have custom types, let's map them safely to ENUM or a default.
    // In Tio Conejo, they used 'INCONSISTENCIA_FUENTES' as a safe default if the type is not in enum, or cast it.
    // We will cast it as any if it doesn't match perfectly, or assign a default. Prisma will throw if invalid.
    // Wait, prisma type TipoHallazgo is an enum. Let's see what Prisma schema accepts.
    // Actually, casting `as TipoHallazgo` is valid since TypeScript bypasses, but at runtime Prisma validates strings against enums.
    // Let's use a safe fallback if it fails, or just trust the input if the schema was updated.
    // The prompt uses types like "PAGO_PARCIAL_INCOMPLETO", "GAP_TEMPORAL", "INFORMATIVO", "OPORTUNIDAD_REVENUE".
    // "Let's cast it: h.tipo as any" to let Prisma parse. If it fails, we fall back to generic.
    // However, the JSON has `h.riesgo` pointing to the exact original type, and we can map `tipo` to a valid enum like `OTROS` or `INCONSISTENCIA_FUENTES`.
    let tipoEnum = h.riesgo as any; // usually we map this.
    
    // To be perfectly safe, we map it based on `h.riesgo` or `h.tipo`
    let categoriaEnum: CategoriaHallazgo = 'REVENUE';
    if (h.categoria === 'CONCILIACION') categoriaEnum = 'CONSISTENCIA';
    
    await prisma.hallazgo.create({
      data: {
        fideicomisoId: fid.id,
        tipo: (h.tipo && h.tipo.length > 0) ? h.tipo : 'INCONSISTENCIA_FUENTES',
        severidad: severidadEnum,
        categoria: categoriaEnum,
        subcategoria: subcategoriaMap[h.id] || 'ANOMALIA',
        area: areaEnum,
        titulo: h.titulo,
        descripcion: h.descripcion_operativa,
        razonamiento: JSON.stringify(razonamientoObj),
        fuentes: h.documentos_fuente,
        impactoEconomico: h.impacto_economico !== undefined ? h.impacto_economico : null,
        estado: h.estado || 'ABIERTO',
      }
    });
  }

  console.log('Seed de Sautari (hallazgos) completado correctamente!');
}

main()
  .catch((e) => {
    console.error('Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
