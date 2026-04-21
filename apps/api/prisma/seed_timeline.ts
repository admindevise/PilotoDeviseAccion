import { PrismaClient, TipoEvento } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fideicomisos = await prisma.fideicomiso.findMany({
    include: {
      contratos: true,
      hallazgos: true,
      documentos: true,
      fideicomitentes: true,
      eventosTimeline: true,
    }
  });

  let eventsCreated = 0;

  for (const fid of fideicomisos) {
    if (fid.eventosTimeline.length > 0) {
      console.log(`Skipping ${fid.codigoPrincipal}, ya tiene eventos en el timeline.`);
      continue;
    }

    // 1. Evento de Constitución
    await prisma.eventoTimeline.create({
      data: {
        fideicomisoId: fid.id,
        tipo: 'CONSTITUCION',
        fecha: fid.fechaConstitucion,
        titulo: 'Constitución del Fideicomiso',
        descripcion: `Firma del acta de constitución y alta del esquema fiduciario (${fid.tipologia}).`,
        referenciaId: fid.id,
        referenciaTipo: 'FIDEICOMISO'
      }
    });
    eventsCreated++;

    // 2. Fideicomitentes / Partes
    for (const p of fid.fideicomitentes) {
      await prisma.eventoTimeline.create({
        data: {
          fideicomisoId: fid.id,
          tipo: 'CAMBIO_FIDEICOMITENTE',
          fecha: p.vigenciaDesde,
          titulo: `Vinculación: ${p.nombre}`,
          descripcion: `Se registra a ${p.nombre} como ${p.tipo} en el esquema.`,
          referenciaId: p.id,
          referenciaTipo: 'FIDEICOMITENTE'
        }
      });
      eventsCreated++;
    }

    // 3. Contratos / Otrosíes
    for (const c of fid.contratos) {
      if (c.tipo !== 'CONTRATO_FIDUCIA') {
        await prisma.eventoTimeline.create({
          data: {
            fideicomisoId: fid.id,
            tipo: c.tipo === 'CESION_DERECHOS' ? 'CESION' : 'OTROSI',
            fecha: c.fechaFirma,
            titulo: c.numero ? `Firma de ${c.numero}` : `Firma de Contrato/Otrosí (${c.tipo})`,
            descripcion: c.resumen || `Entrada en vigencia del documento contractual.`,
            referenciaId: c.id,
            referenciaTipo: 'CONTRATO'
          }
        });
        eventsCreated++;
      }
    }

    // 4. Hallazgos
    for (const h of fid.hallazgos) {
      await prisma.eventoTimeline.create({
        data: {
          fideicomisoId: fid.id,
          tipo: 'HALLAZGO_DETECTADO',
          fecha: h.createdAt,
          titulo: `Alerta: ${h.titulo.substring(0, 50)}...`,
          descripcion: `IA detectó ${h.categoria} (${h.severidad}): ${h.descripcion.substring(0, 100)}...`,
          referenciaId: h.id,
          referenciaTipo: 'HALLAZGO'
        }
      });
      eventsCreated++;
    }

    console.log(`Generados eventos para: ${fid.codigoPrincipal}`);
  }

  console.log(`\nTimeline regenerado con éxito. Se insertaron ${eventsCreated} eventos históricos.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
