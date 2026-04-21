import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getOpportunities(query: {
    fideicomisoId?: string;
    subcategoria?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Revenue opportunities are hallazgos with economic impact > 0
    const where: Record<string, unknown> = {
      impactoEconomico: { gt: 0 },
    };
    if (query.fideicomisoId) where.fideicomisoId = query.fideicomisoId;
    if (query.subcategoria) where.subcategoria = query.subcategoria;

    const [items, total] = await Promise.all([
      this.prisma.hallazgo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { impactoEconomico: 'desc' },
        include: {
          fideicomiso: {
            select: { id: true, codigoPrincipal: true, nombre: true },
          },
        },
      }),
      this.prisma.hallazgo.count({ where }),
    ]);

    const totalPotencial = await this.prisma.hallazgo.aggregate({
      where,
      _sum: { impactoEconomico: true },
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalPotencial: totalPotencial._sum.impactoEconomico || 0,
      },
    };
  }

  async getSummary() {
    const byCategoria = await this.prisma.hallazgo.groupBy({
      by: ['categoria'],
      where: { impactoEconomico: { gt: 0 } },
      _sum: { impactoEconomico: true },
      _count: true,
    });

    // Group by subcategoria for the new revenue tiers
    const bySubcategoria = await this.prisma.hallazgo.groupBy({
      by: ['subcategoria'],
      where: { 
        impactoEconomico: { gt: 0 },
        subcategoria: { not: null },
      },
      _sum: { impactoEconomico: true },
      _count: true,
    });

    const potencialByFideicomiso = await this.prisma.hallazgo.groupBy({
      by: ['fideicomisoId'],
      where: { impactoEconomico: { gt: 0 } },
      _sum: { impactoEconomico: true },
      _count: true,
    });

    // Breakdown by fideicomiso AND subcategoria
    const subcatByFideicomiso = await this.prisma.hallazgo.groupBy({
      by: ['fideicomisoId', 'subcategoria'],
      where: { 
        impactoEconomico: { gt: 0 },
        subcategoria: { not: null },
      },
      _sum: { impactoEconomico: true },
      _count: true,
    });

    // Extract collected revenue (Facturas where estado = PAGADA)
    const cobradoByFideicomiso = await this.prisma.factura.groupBy({
      by: ['fideicomisoId'],
      where: { estado: 'PAGADA' },
      _sum: { total: true },
      _count: true,
    });

    // Calculate total collected revenue
    const totalCobrado = cobradoByFideicomiso.reduce((acc, curr) => acc + (curr._sum.total || 0), 0);

    // Get unique Fideicomiso IDs that have either potencial or cobrado
    const uniqueFideicomisoIds = new Set([
      ...potencialByFideicomiso.map(p => p.fideicomisoId),
      ...cobradoByFideicomiso.map(c => c.fideicomisoId)
    ]);

    // Fetch details for these fideicomisos
    const fideicomisos = await this.prisma.fideicomiso.findMany({
      where: { id: { in: Array.from(uniqueFideicomisoIds) } },
      select: { id: true, codigoPrincipal: true, nombre: true }
    });

    return {
      data: {
        totalCobrado,
        byCategoria: byCategoria.map((g: any) => ({
          categoria: g.categoria,
          monto: g._sum?.impactoEconomico || 0,
          cantidad: g._count,
        })),
        bySubcategoria: bySubcategoria.map((g: any) => ({
          subcategoria: g.subcategoria,
          monto: g._sum?.impactoEconomico || 0,
          cantidad: g._count,
        })),
        byFideicomiso: Array.from(uniqueFideicomisoIds).map(fId => {
          const potencial = potencialByFideicomiso.find(p => p.fideicomisoId === fId);
          const cobrado = cobradoByFideicomiso.find(c => c.fideicomisoId === fId);
          const fidDetails = fideicomisos.find(f => f.id === fId);
          
          // Build subcategoria breakdown for this fideicomiso
          const subcatBreakdown: Record<string, number> = {};
          subcatByFideicomiso
            .filter(s => s.fideicomisoId === fId)
            .forEach(s => {
              if (s.subcategoria) {
                subcatBreakdown[s.subcategoria] = s._sum?.impactoEconomico || 0;
              }
            });

          return {
            fideicomisoId: fId,
            codigoPrincipal: fidDetails?.codigoPrincipal || 'N/A',
            nombre: fidDetails?.nombre || 'Desconocido',
            monto: potencial?._sum?.impactoEconomico || 0,
            cantidad: potencial?._count || 0,
            cobrado: cobrado?._sum.total || 0,
            subcategorias: subcatBreakdown,
          };
        }),
      },
    };
  }
}
