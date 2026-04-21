import { PrismaClient, SeveridadHallazgo, TipoHallazgo, CategoriaHallazgo, EstadoHallazgo, AreaHallazgo } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fideicomisos = await prisma.fideicomiso.findMany({
    include: {
      facturas: {
        include: { recaudos: true }
      }
    }
  });

  for (const f of fideicomisos) {
    let facturadoAnuladas = 0;
    let countAnuladas = 0;

    let sobrepagos = 0;
    let countSobrepagadas = 0;

    for (const fact of f.facturas) {
      // 1. Check Anuladas
      if (fact.estado === 'ANULADA' || fact.estado === 'ANULADA_NC') {
        facturadoAnuladas += fact.total;
        countAnuladas++;
      }

      // 2. Check Sobrepagos (recaudos > total de factura activa)
      if (fact.estado !== 'ANULADA' && fact.estado !== 'ANULADA_NC') {
        const sumRec = fact.recaudos.reduce((s, r) => s + r.monto, 0);
        if (sumRec > fact.total) {
          sobrepagos += (sumRec - fact.total);
          countSobrepagadas++;
        }
      }
    }

    // Insert Hallazgo for Anuladas if existent
    if (countAnuladas > 0) {
      await prisma.hallazgo.create({
        data: {
          fideicomisoId: f.id,
          tipo: 'INCONSISTENCIA_FUENTES',
          severidad: 'MEDIO',
          categoria: 'ANOMALIA',
          area: 'CONTABILIDAD',
          titulo: 'Facturación Anulada contabilizada como flujo activo',
          descripcion: `Se detectaron ${countAnuladas} facturas en estado ANULADA o ANULADA_NC que históricamente se sumaban al total facturado en los reportes de Excel de la Fiduciaria, inflando artificialmente la expectativa de recaudo.`,
          razonamiento: JSON.stringify({
             calculoEsperado: `Valor total de facturas anuladas: $${facturadoAnuladas.toLocaleString()}`,
             conclusion: "El sistema actual descuenta estas facturas del Total Facturado y de la Cartera Pendiente para mostrar el estado real.",
             riesgoIdentificado: "Sobreestimación de ingresos y cartera ficticia."
          }, null, 2),
          estado: 'ABIERTO',
          impactoEconomico: facturadoAnuladas,
          fuentes: []
        }
      });
      console.log(`Hallazgo creado en ${f.codigoPrincipal}: ${countAnuladas} facturas anuladas por $${facturadoAnuladas}`);
    }

    // Insert Hallazgo for Sobrepagos if existent
    if (countSobrepagadas > 0) {
      await prisma.hallazgo.create({
        data: {
          fideicomisoId: f.id,
          tipo: 'INCONSISTENCIA_FUENTES',
          severidad: 'MEDIO',
          categoria: 'ANOMALIA',
          area: 'CONTABILIDAD',
          titulo: 'Recaudos exceden el valor total facturado (Sobrepagos)',
          descripcion: `Se detectaron ${countSobrepagadas} facturas donde la suma de los recaudos asociados es mayor al valor total de la factura. En reportes de Excel históricos estos excesos no se reflejaban en el total recaudado.`,
          razonamiento: JSON.stringify({
             calculoEsperado: `Exceso de recaudo total (sobrepagos no justificados en factura): $${sobrepagos.toLocaleString()}`,
             conclusion: "El sistema actual consolida todos los recaudos ingresados desde las fuentes crudas, evidenciando pagos en exceso que requieren depuración o re-asignación contable.",
             riesgoIdentificado: "Saldos a favor de clientes sin legalizar o pagos mal aplicados a facturas incorrectas."
          }, null, 2),
          estado: 'ABIERTO',
          impactoEconomico: sobrepagos,
          fuentes: []
        }
      });
      console.log(`Hallazgo creado en ${f.codigoPrincipal}: ${countSobrepagadas} facturas con sobrepagos por $${sobrepagos}`);
    }
  }

  console.log("Generación de hallazgos contables finalizada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
