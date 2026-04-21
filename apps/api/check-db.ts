import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fid = await prisma.fideicomiso.findUnique({
    where: { codigoPrincipal: '110100' },
    include: {
      documentos: true,
      codigosSuperintendencia: true
    }
  });
  
  if (!fid) {
    console.log("Not found");
  } else {
    console.log(`Found: ${fid.nombre}`);
    console.log(`Docs count: ${fid.documentos.length}`);
    for (const d of fid.documentos) {
      console.log(` - ${d.nombreArchivo} (${d.tipo})`);
    }
  }
}

main().finally(() => prisma.$disconnect());
