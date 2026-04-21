import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VariableMacroService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const variables = await this.prisma.variableMacroeconomica.findMany({
      orderBy: { codigo: 'asc' },
      include: {
        valores: {
          orderBy: { vigenciaDesde: 'desc' },
          take: 20, // Include historical values
        },
      },
    });

    return {
      data: variables.map((v) => ({
        ...v,
        valorActual: v.valores[0] || null,
        valores: v.valores, // keep history attached
      })),
    };
  }

  async findByCodigo(codigo: string) {
    const variable = await this.prisma.variableMacroeconomica.findUnique({
      where: { codigo: codigo.toUpperCase() },
      include: {
        valores: {
          orderBy: { vigenciaDesde: 'desc' },
          take: 5,
        },
      },
    });

    if (!variable) {
      throw new NotFoundException(`Variable ${codigo} not found`);
    }

    return { data: variable };
  }

  async addValor(
    codigo: string,
    data: {
      valor: number;
      vigenciaDesde: string | Date;
      vigenciaHasta?: string | Date;
      normaLegal?: string;
      registradoPor?: string;
    },
  ) {
    const variable = await this.prisma.variableMacroeconomica.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });

    if (!variable) {
      throw new NotFoundException(`Variable ${codigo} not found`);
    }

    // Close the previous latest value's vigenciaHasta if open
    const latestValor = await this.prisma.valorHistoricoVariable.findFirst({
      where: { variableId: variable.id, vigenciaHasta: null },
      orderBy: { vigenciaDesde: 'desc' },
    });

    if (latestValor) {
      const newStart = new Date(data.vigenciaDesde);
      const closingDate = new Date(newStart.getTime() - 86400000); // day before
      await this.prisma.valorHistoricoVariable.update({
        where: { id: latestValor.id },
        data: { vigenciaHasta: closingDate },
      });
    }

    const valor = await this.prisma.valorHistoricoVariable.create({
      data: {
        variableId: variable.id,
        valor: data.valor,
        vigenciaDesde: new Date(data.vigenciaDesde),
        vigenciaHasta: data.vigenciaHasta ? new Date(data.vigenciaHasta) : undefined,
        normaLegal: data.normaLegal,
        registradoPor: data.registradoPor,
      },
    });

    return { data: valor };
  }

  async getValores(
    codigo: string,
    query: { page?: number; limit?: number },
  ) {
    const variable = await this.prisma.variableMacroeconomica.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });

    if (!variable) {
      throw new NotFoundException(`Variable ${codigo} not found`);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.valorHistoricoVariable.findMany({
        where: { variableId: variable.id },
        skip,
        take: limit,
        orderBy: { vigenciaDesde: 'desc' },
      }),
      this.prisma.valorHistoricoVariable.count({ where: { variableId: variable.id } }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), variable: { codigo: variable.codigo, nombre: variable.nombre } },
    };
  }
}
