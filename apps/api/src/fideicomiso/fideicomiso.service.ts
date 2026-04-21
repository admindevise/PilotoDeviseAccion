import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FideicomisoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { estado?: string; tipologia?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.estado) where.estado = query.estado;
    if (query.tipologia) where.tipologia = query.tipologia;

    const [items, total] = await Promise.all([
      this.prisma.fideicomiso.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          codigosSuperintendencia: true,
          _count: {
            select: {
              contratos: true,
              hallazgos: true,
              conciliaciones: true,
            },
          },
        },
      }),
      this.prisma.fideicomiso.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const [fideicomiso, movimientosGantt, facturasGantt] = await Promise.all([
      this.prisma.fideicomiso.findUnique({
        where: { id },
        include: {
          codigosSuperintendencia: true,
          fideicomitentes: true,
          contratos: {
            include: { reglasComision: true },
          },
          documentos: true,
          conocimiento: true,
          convenciones: true,
          eventosTimeline: {
            orderBy: { fecha: 'desc' }
          },
          _count: {
            select: {
              documentos: true,
              hallazgos: true,
              conciliaciones: true,
              movimientosContables: true,
            },
          },
        },
      }),
      this.prisma.movimientoContable.groupBy({
        by: ['origenERP'],
        where: { fideicomisoId: id },
        _min: { fecha: true },
        _max: { fecha: true },
      }),
      this.prisma.factura.aggregate({
        where: { fideicomisoId: id },
        _min: { fecha: true },
        _max: { fecha: true },
      }),
    ]);

    if (!fideicomiso) {
      throw new NotFoundException(`Fideicomiso ${id} not found`);
    }

    return {
      ...fideicomiso,
      ganttData: {
        movimientos: movimientosGantt,
        facturas: facturasGantt,
      },
    };
  }

  async create(data: {
    codigoPrincipal: string;
    nombre: string;
    fiduciariaAdmin: string;
    fechaConstitucion: string | Date;
    tipologia: string;
    descripcion?: string;
  }) {
    const fideicomiso = await this.prisma.fideicomiso.create({
      data: {
        codigoPrincipal: data.codigoPrincipal,
        nombre: data.nombre,
        fiduciariaAdmin: data.fiduciariaAdmin,
        fechaConstitucion: new Date(data.fechaConstitucion),
        tipologia: data.tipologia as any,
        descripcion: data.descripcion,
        codigosSuperintendencia: {
          create: {
            codigo: data.codigoPrincipal,
            tipo: 'PRINCIPAL',
            vigenciaDesde: new Date(data.fechaConstitucion),
          },
        },
        eventosTimeline: {
          create: {
            tipo: 'CONSTITUCION',
            fecha: new Date(data.fechaConstitucion),
            titulo: `Constitución del fideicomiso ${data.codigoPrincipal}`,
            descripcion: `Fideicomiso ${data.nombre} constituido bajo administración de ${data.fiduciariaAdmin}`,
          },
        },
      },
      include: { codigosSuperintendencia: true },
    });

    return { data: fideicomiso };
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.ensureExists(id);

    const fideicomiso = await this.prisma.fideicomiso.update({
      where: { id },
      data,
      include: { codigosSuperintendencia: true },
    });

    return { data: fideicomiso };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.fideicomiso.delete({ where: { id } });
    return { data: { deleted: true } };
  }

  async addCodigo(
    fideicomisoId: string,
    data: {
      codigo: string;
      tipo?: string;
      vigenciaDesde: string | Date;
      vigenciaHasta?: string | Date;
      motivoCambio?: string;
    },
  ) {
    await this.ensureExists(fideicomisoId);

    const codigo = await this.prisma.codigoFideicomiso.create({
      data: {
        fideicomisoId,
        codigo: data.codigo,
        tipo: data.tipo || 'ALIAS',
        vigenciaDesde: new Date(data.vigenciaDesde),
        vigenciaHasta: data.vigenciaHasta ? new Date(data.vigenciaHasta) : undefined,
        motivoCambio: data.motivoCambio,
      },
    });

    await this.prisma.eventoTimeline.create({
      data: {
        fideicomisoId,
        tipo: 'CAMBIO_CODIGO',
        fecha: new Date(data.vigenciaDesde),
        titulo: `Nuevo código asignado: ${data.codigo}`,
        descripcion: data.motivoCambio || undefined,
        referenciaId: codigo.id,
        referenciaTipo: 'CodigoFideicomiso',
      },
    });

    return { data: codigo };
  }

  async getTimeline(fideicomisoId: string, query: { tipo?: string; limit?: number }) {
    await this.ensureExists(fideicomisoId);
    const limit = query.limit || 50;

    const where: Record<string, unknown> = { fideicomisoId };
    if (query.tipo) where.tipo = query.tipo;

    const eventos = await this.prisma.eventoTimeline.findMany({
      where,
      orderBy: { fecha: 'desc' },
      take: limit,
    });

    return { data: eventos, meta: { count: eventos.length } };
  }

  private async ensureExists(id: string) {
    const count = await this.prisma.fideicomiso.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException(`Fideicomiso ${id} not found`);
    }
  }
}
