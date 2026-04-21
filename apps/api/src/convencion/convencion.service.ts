import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConvencionService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFideicomiso(
    fideicomisoId: string,
    query: { tipo?: string; vigente?: string; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { fideicomisoId };
    if (query.tipo) where.tipo = query.tipo;
    if (query.vigente === 'true') {
      where.OR = [
        { vigenciaHasta: null },
        { vigenciaHasta: { gte: new Date() } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.convencionFideicomiso.findMany({
        where,
        skip,
        take: limit,
        orderBy: { vigenciaDesde: 'desc' },
      }),
      this.prisma.convencionFideicomiso.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(
    fideicomisoId: string,
    data: {
      tipo: string;
      nombre: string;
      descripcion: string;
      parametros?: unknown;
      vigenciaDesde: string | Date;
      vigenciaHasta?: string | Date;
      fuenteDocumental?: string;
      registradoPor: string;
    },
  ) {
    const fideicomiso = await this.prisma.fideicomiso.findUnique({ where: { id: fideicomisoId } });
    if (!fideicomiso) {
      throw new NotFoundException(`Fideicomiso ${fideicomisoId} not found`);
    }

    const convencion = await this.prisma.convencionFideicomiso.create({
      data: {
        fideicomisoId,
        tipo: data.tipo as any,
        nombre: data.nombre,
        descripcion: data.descripcion,
        parametros: data.parametros as any,
        vigenciaDesde: new Date(data.vigenciaDesde),
        vigenciaHasta: data.vigenciaHasta ? new Date(data.vigenciaHasta) : undefined,
        fuenteDocumental: data.fuenteDocumental,
        registradoPor: data.registradoPor,
      },
    });

    return { data: convencion };
  }

  async update(id: string, data: Record<string, unknown>) {
    const convencion = await this.prisma.convencionFideicomiso.findUnique({ where: { id } });
    if (!convencion) {
      throw new NotFoundException(`Convencion ${id} not found`);
    }

    // Convert date strings to Date objects if present
    const updateData = { ...data };
    if (updateData.vigenciaDesde) updateData.vigenciaDesde = new Date(updateData.vigenciaDesde as string);
    if (updateData.vigenciaHasta) updateData.vigenciaHasta = new Date(updateData.vigenciaHasta as string);

    const updated = await this.prisma.convencionFideicomiso.update({
      where: { id },
      data: updateData,
    });

    return { data: updated };
  }
}
