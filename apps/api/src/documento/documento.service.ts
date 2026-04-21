import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentoService {
  private readonly logger = new Logger(DocumentoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByFideicomiso(
    fideicomisoId: string,
    query: { tipo?: string; procesado?: string; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { fideicomisoId };
    if (query.tipo) where.tipo = query.tipo;
    if (query.procesado !== undefined) where.procesado = query.procesado === 'true';

    const [items, total] = await Promise.all([
      this.prisma.documento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaCarga: 'desc' },
        select: {
          id: true,
          tipo: true,
          formatoOriginal: true,
          nombreArchivo: true,
          fechaCarga: true,
          fechaDocumento: true,
          contextoUsuario: true,
          clasificacion: true,
          procesado: true,
          cargadoPor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.documento.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAll(query: { fideicomisoId?: string; tipo?: string; procesado?: boolean; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.fideicomisoId) where.fideicomisoId = query.fideicomisoId;
    if (query.tipo) where.tipo = query.tipo;
    if (query.procesado !== undefined) where.procesado = query.procesado;

    const [items, total] = await Promise.all([
      this.prisma.documento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaCarga: 'desc' },
        select: {
          id: true,
          tipo: true,
          formatoOriginal: true,
          nombreArchivo: true,
          fechaCarga: true,
          fechaDocumento: true,
          contextoUsuario: true,
          clasificacion: true,
          procesado: true,
          fideicomiso: { select: { id: true, nombre: true, codigoPrincipal: true } },
          cargadoPor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.documento.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async upload(
    fideicomisoId: string,
    data: {
      tipo: string;
      formatoOriginal: string;
      nombreArchivo: string;
      rutaAlmacenamiento: string;
      fechaDocumento?: string | Date;
      contextoUsuario?: string;
      cargadoPorId: string;
    },
  ) {
    const fideicomiso = await this.prisma.fideicomiso.findUnique({ where: { id: fideicomisoId } });
    if (!fideicomiso) {
      throw new NotFoundException(`Fideicomiso ${fideicomisoId} not found`);
    }

    const documento = await this.prisma.documento.create({
      data: {
        fideicomisoId,
        tipo: data.tipo as any,
        formatoOriginal: data.formatoOriginal as any,
        nombreArchivo: data.nombreArchivo,
        rutaAlmacenamiento: data.rutaAlmacenamiento,
        fechaDocumento: data.fechaDocumento ? new Date(data.fechaDocumento) : undefined,
        contextoUsuario: data.contextoUsuario,
        cargadoPorId: data.cargadoPorId,
      },
    });

    // Trigger AI classification asynchronously
    this.classifyAsync(documento.id).catch((err) =>
      this.logger.error(`Classification error for doc ${documento.id}: ${err.message}`),
    );

    return { data: documento };
  }

  private async classifyAsync(documentoId: string) {
    const doc = await this.prisma.documento.findUnique({
      where: { id: documentoId },
      select: { id: true, nombreArchivo: true, textoExtraido: true, contextoUsuario: true },
    });
    if (!doc?.textoExtraido) return;

    try {
      // @ts-ignore - ai-engine is a runtime dependency not compiled for this service
      const { classifyDocument } = await import('@fideicomiso/ai-engine');
      const result = await classifyDocument({
        filename: doc.nombreArchivo,
        content: doc.textoExtraido,
        userContext: doc.contextoUsuario || undefined,
      });

      await this.prisma.documento.update({
        where: { id: documentoId },
        data: {
          tipo: result.data.tipo as any,
          clasificacion: result.data as any,
          procesado: true,
        },
      });

      this.logger.log(
        `Document ${doc.nombreArchivo} classified as ${result.data.tipo} (confidence: ${result.data.confidence})`,
      );
    } catch (err) {
      this.logger.warn(`AI classification unavailable for ${doc.nombreArchivo}: ${(err as Error).message}`);
    }
  }

  async findOne(id: string) {
    const documento = await this.prisma.documento.findUnique({
      where: { id },
      include: {
        fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
        cargadoPor: { select: { id: true, name: true } },
        contrato: { select: { id: true, tipo: true, numero: true } },
      },
    });

    if (!documento) {
      throw new NotFoundException(`Documento ${id} not found`);
    }

    return { data: documento };
  }

  async getFileStream(id: string) {
    const documento = await this.prisma.documento.findUnique({
      where: { id },
      include: {
        fideicomiso: true,
      }
    });

    if (!documento) {
      throw new NotFoundException(`Documento ${id} not found`);
    }

    // Try to locate the file in our local sources folder recursively
    const baseDir = path.resolve(process.cwd(), '../../data/fideicomisos_fuentes');
    let targetPath = '';

    // Si ya existe la ruta enlazada absoluta en la BD, la priorizamos
    if (documento.rutaAlmacenamiento && fs.existsSync(documento.rutaAlmacenamiento)) {
      targetPath = documento.rutaAlmacenamiento;
    } else {
      // Búsqueda recursiva por fallback
      const findFileRecursively = (dir: string, filename: string): string | null => {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            const res = findFileRecursively(fullPath, filename);
            if (res) return res;
          } else if (file === filename) {
            return fullPath;
          }
        }
        return null;
      };

      targetPath = findFileRecursively(baseDir, documento.nombreArchivo) || '';
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      this.logger.warn(`Archivo físico no encontrado para el documento ${id}: ${documento.nombreArchivo}. Retornando dummy file.`);
      // Mock flow: Return a dummy text/pdf file because the DB is seeded but not the drive
      return this.generateDummyFile(documento.nombreArchivo, documento.formatoOriginal);
    }

    const mimeTypes: Record<string, string> = {
      'PDF': 'application/pdf',
      'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'CSV': 'text/csv',
      'TXT': 'text/plain',
      'HTML': 'text/html',
    };

    const stream = fs.createReadStream(targetPath);
    return {
      stream,
      filename: documento.nombreArchivo,
      mimetype: mimeTypes[documento.formatoOriginal] || 'application/octet-stream',
    };
  }

  private generateDummyFile(filename: string, formato: string) {
    const { Readable } = require('stream');
    
    // For PDFs, we can actually serve a tiny valid but empty PDF buffer
    let buffer: Buffer;
    let mimetype = 'text/plain';

    if (formato === 'PDF') {
      // Minimal valid PDF representing a blank page
      const pdfBase64 = "JVBERi0xLjAKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUgODQyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNyAwMDAwMCBuIAp0cmFpbGVyCjwwCi9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE3MwolJUVPRgo=";
      buffer = Buffer.from(pdfBase64, 'base64');
      mimetype = 'application/pdf';
    } else {
      buffer = Buffer.from(`Contenido simulado para ${filename}. El archivo físico no se encuentra en el servidor local debido a que proceden de datos resembrados.`, 'utf8');
      
      const mimeTypes: Record<string, string> = {
        'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'CSV': 'text/csv',
        'TXT': 'text/plain',
      };
      mimetype = mimeTypes[formato] || 'application/octet-stream';
    }

    return {
      stream: Readable.from(buffer),
      filename,
      mimetype,
    };
  }
}
