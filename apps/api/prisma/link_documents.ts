import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function walkDir(dir: string): Promise<string[]> {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === '.DS_Store') continue;
    const fullPath = path.resolve(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(await walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  const dataPath = path.resolve(__dirname, '../../../data/fideicomisos_fuentes');
  if (!fs.existsSync(dataPath)) {
    console.log("No data/fideicomisos_fuentes directory found.");
    return;
  }

  const allFiles = await walkDir(dataPath);
  console.log(`Se encontraron ${allFiles.length} archivos físicos en la carpeta de fuentes.`);

  // Mapping strategy: 
  // Intentar matchar el nombre de archivo (basado en el final del path) 
  // con los registros de Documento que tienen nombreArchivo similar.

  const docs = await prisma.documento.findMany();
  let relinked = 0;

  for (const doc of docs) {
    const fileName = doc.nombreArchivo;
    
    // Buscar si algún archivo real en las carpetas coincide parcialmente o totalmente
    const matchedFile = allFiles.find(f => {
      const base = path.basename(f);
      // Evitar matches vacios
      if(!fileName) return false;
      return base.toLowerCase() === fileName.toLowerCase() || 
             base.toLowerCase().includes(fileName.toLowerCase()) ||
             fileName.toLowerCase().includes(base.toLowerCase());
    });

    if (matchedFile) {
      if (doc.rutaAlmacenamiento !== matchedFile) {
        await prisma.documento.update({
          where: { id: doc.id },
          data: { rutaAlmacenamiento: matchedFile }
        });
        relinked++;
        console.log(`[LINKED] ${doc.nombreArchivo} -> ${matchedFile}`);
      }
    }
  }

  console.log(`\nProceso completado: Se actualizaron y enlazaron ${relinked} rutas de almacenamiento de documentos a archivos físicos.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
