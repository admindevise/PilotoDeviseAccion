import * as xlsx from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const excelPath = path.resolve(__dirname, '../../data/fideicomisos_fuentes/BalancesConsolidado.xlsx');

// Normalizar strings
function norm(str: string | undefined): string {
    if (!str) return '';
    return str.toString().trim();
}

// Convertir fecha serial de excel a JS Date
function excelDateToJSDate(serial: number) {
    if (!serial) return new Date();
    // Excel bug: 1900 was not a leap year, but excel thinks it is
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    return date_info;
}

// Map the Excel Sheet Names to the corresponding Prisma main Fideicomiso code
const sheetToFideicomisoCode: Record<string, string> = {
    'B3Virrey13527': 'FA-658',
    'B3Virrey36640': 'FA-658',
    'Royal2644764': 'FA-2594',
    'Sautari110100': 'FA-5931',
    'TioConejo80240': 'FA-6593',
    'TioConejo127817': 'FA-6593',
    'Vimarsa111528': 'FA-5999'
};

async function main() {
    console.log(`Reading Excel file: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    
    // Primero, traemos los IDs de los fideicomisos usando los códigos mapeados
    const fideicomisoIds: Record<string, string> = {};
    for (const [sheet, codigo] of Object.entries(sheetToFideicomisoCode)) {
        if (fideicomisoIds[codigo]) continue;

        const fid = await prisma.fideicomiso.findUnique({
            where: { codigoPrincipal: codigo }
        });

        if (fid) {
            fideicomisoIds[codigo] = fid.id;
        } else {
            console.warn(`WARNING: Fideicomiso not found for code: ${codigo}`);
        }
    }

    console.log("Fideicomisos identified:", fideicomisoIds);

    // Wiping the Facturas to ensure a pure sync with this Excel File
    console.log("Deleting all Facturas and Recaudos to start fresh from Excel...");
    await prisma.factura.deleteMany();

    // Global map to aggregate across all sheets
    // Key: "fideicomisoId|numeroFactura"
    const globalAggregated = new Map<string, any>();

    // Ahora leemos cada hoja y procesamos las facturas en memoria
    for (const sheetName of workbook.SheetNames) {
        if (sheetName === 'Dashboard' || sheetName === 'CONSOLIDADO') continue;

        const codigoFideicomiso = sheetToFideicomisoCode[sheetName];
        const fideicomisoId = fideicomisoIds[codigoFideicomiso];

        if (!fideicomisoId) {
            console.warn(`Skipping sheet ${sheetName} because Fideicomiso target was not found in DB.`);
            continue;
        }

        console.log(`Aggregating Sheet into memory: ${sheetName} -> Fideicomiso ${codigoFideicomiso}`);

        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        
        // Encontrar el indice donde empiezan los datos
        let dataStartIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i] && rows[i].length > 0 && String(rows[i][0]).toUpperCase().includes('IDENTIFICACION')) {
                dataStartIndex = i + 1;
                break;
            }
        }

        if (dataStartIndex === -1) {
            console.error(`- Error: Could not find header row in sheet ${sheetName}`);
            continue;
        }

        for (let i = dataStartIndex; i < rows.length; i++) {
            const r = rows[i];
            
            const identificacion = r[0]; 
            const anio = r[2];           
            const fechaDcto = r[3];      
            const noDcto = r[4];         
            const descripcion = r[5];
            const causado = parseFloat(String(r[6]).replace(/[^0-9.-]+/g,"")) || 0;    
            const pendiente = parseFloat(String(r[7]).replace(/[^0-9.-]+/g,"")) || 0;  

            const numStr = String(noDcto).trim();
            const upperStr = numStr.toUpperCase();

            // Excluir Notas (NC), Recibos (RCJ/RCE), Saldos (SAF), y números puros (Ej: cedulas/identificaciones puestas como DCTO)
            if (!numStr || 
                upperStr.includes('SUBTOTAL') || 
                upperStr.includes('TOTAL') || 
                upperStr === 'NO. DCTO.' ||
                upperStr === 'UNDEFINED' ||
                upperStr.startsWith('RCJ') ||
                upperStr.startsWith('NC') ||
                upperStr.startsWith('SAF') ||
                upperStr.startsWith('ND') || // Notas Débito
                /^[\d,.]+$/.test(numStr) // Si son solo numeros o numeros con decimales/comas, es un monto arrastrado por error al excel
            ) {
                continue; 
            }
            const globalKey = `${fideicomisoId}|${numStr}`;

            if (!globalAggregated.has(globalKey)) {
                let parsedDate = typeof fechaDcto === 'number' ? excelDateToJSDate(fechaDcto) : new Date();

                globalAggregated.set(globalKey, {
                    fideicomisoId,
                    numeroFactura: numStr,
                    fecha: parsedDate,
                    concepto: descripcion ? String(descripcion) : "",
                    monto: 0,
                    total: 0,
                    recaudoTotal: 0,
                    pendienteTotal: 0,
                    periodoContable: String(anio || parsedDate.getFullYear()),
                    codigoSuper: String(identificacion)
                });
            }

            const existing = globalAggregated.get(globalKey);
            // Evitar concatenar indefinidamente
            if (!existing.concepto.includes(descripcion)) {
                existing.concepto += " | " + (descripcion || "");
            }
            
            // El valor facturado repetido en multiples pagos no se suma. Es el valor total de la factura.
            if (causado > existing.total) {
                existing.total = causado;
                existing.monto = causado;
            }

            // Como los excel vienen ordenados cronológicamente por iteración de pagos,
            // el SALDO PENDIENTE de la última fila repetida es el saldo final de la deuda de esa factura.
            // Asi que lo sobreescribimos sistemáticamente.
            existing.pendienteTotal = pendiente;
        }
    }

    console.log(`\nWriting ${globalAggregated.size} strictly unique invoices to DB...`);
    let addedCount = 0;
    let recaudosCount = 0;

    for (const [globalKey, agg] of globalAggregated.entries()) {
        let recaudoMonto = agg.total - agg.pendienteTotal;

        if (agg.pendienteTotal < 0) {
            recaudoMonto = agg.total + Math.abs(agg.pendienteTotal); 
        }

        let estado = "PENDIENTE";
        if (agg.pendienteTotal <= 0) estado = "PAGADA";
        else if (agg.pendienteTotal < agg.total) estado = "PARCIAL";

        // Some invoices have $0 caused but they are basically administrative entries holding small recaudo adjustments, let's allow them
        
        try {
            const newFact = await prisma.factura.create({
                data: {
                    fideicomisoId: agg.fideicomisoId,
                    numeroFactura: agg.numeroFactura,
                    fecha: agg.fecha,
                    concepto: agg.concepto,
                    monto: agg.total, 
                    total: agg.total,
                    estado,
                    periodoContable: agg.periodoContable,
                    codigoSuper: agg.codigoSuper
                }
            });
            addedCount++;

            if (recaudoMonto > 0) {
                await prisma.recaudo.create({
                    data: {
                        facturaId: newFact.id,
                        fecha: agg.fecha,
                        monto: recaudoMonto,
                        referencia: 'EXCEL-MIGRATION',
                        medioPago: 'CONSOLIDADO',
                    }
                });
                recaudosCount++;
            }

        } catch(e) {
            console.error(`Error processing aggregate ${globalKey}:`, e);
        }
    }
    
    console.log(`- Created ${addedCount} facturas.`);
    console.log(`- Inserted ${recaudosCount} recaudos.`);

    console.log("\nFinished seeding directly from Excel.");

    // Debugging info
    let positiveCausado = 0;
    let exactlyDouble = 0;
    for (const [globalKey, agg] of globalAggregated.entries()) {
        if (agg.total > 0) positiveCausado++;
    }
    console.log(`Debug -> Invoices with Total > 0: ${positiveCausado}`);
    console.log(`Debug -> Expected invoices from dashboard: 506`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
