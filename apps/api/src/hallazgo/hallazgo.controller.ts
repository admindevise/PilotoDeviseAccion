import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import { HallazgoService } from './hallazgo.service';

@Controller()
export class HallazgoController {
  constructor(private readonly hallazgoService: HallazgoService) {}

  @Get('hallazgos/reporte/pdf')
  async generatePdfReport(@Res() res: any) {
    return this.hallazgoService.generatePdfReport(res);
  }

  @Get('fideicomisos/:fideicomisoId/hallazgos/reporte/pdf')
  async generatePdfReportForFideicomiso(
    @Param('fideicomisoId') fideicomisoId: string,
    @Res() res: any,
  ) {
    return this.hallazgoService.generatePdfReportForFideicomiso(fideicomisoId, res);
  }

  @Get('fideicomisos/:fideicomisoId/hallazgos')
  findByFideicomiso(
    @Param('fideicomisoId') fideicomisoId: string,
    @Query('estado') estado?: string,
    @Query('severidad') severidad?: string,
    @Query('categoria') categoria?: string,
    @Query('tipo') tipo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hallazgoService.findByFideicomiso(fideicomisoId, {
      estado,
      severidad,
      categoria,
      tipo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('hallazgos')
  findAll(
    @Query('estado') estado?: string,
    @Query('severidad') severidad?: string,
    @Query('categoria') categoria?: string,
    @Query('tipo') tipo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hallazgoService.findAll({
      estado,
      severidad,
      categoria,
      tipo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('hallazgos/:id')
  findOne(@Param('id') id: string) {
    return this.hallazgoService.findOne(id);
  }

  @Patch('hallazgos/:id/estado')
  changeEstado(
    @Param('id') id: string,
    @Body() body: { estado: string; asignadoAId?: string; justificacion?: string; userId?: string },
  ) {
    return this.hallazgoService.changeEstado(id, body);
  }

  @Post('hallazgos/:id/resoluciones')
  addResolucion(
    @Param('id') id: string,
    @Body()
    body: {
      tipo: string;
      explicacion: string;
      adjuntos?: unknown;
      resueltoPorId: string;
    },
  ) {
    return this.hallazgoService.addResolucion(id, body);
  }

  // ============================================================
  // BITÁCORA DE GESTIÓN — Endpoints de Trazabilidad
  // ============================================================

  @Patch('hallazgos/:id')
  updateHallazgo(
    @Param('id') id: string,
    @Body() body: { cambios: Record<string, unknown>; justificacion: string; userId: string },
  ) {
    return this.hallazgoService.updateHallazgo(id, body);
  }

  @Post('hallazgos/:id/comentarios')
  addComentario(
    @Param('id') id: string,
    @Body() body: { contenido: string; tipo?: 'COMENTARIO' | 'NOTA_GESTION'; userId: string },
  ) {
    return this.hallazgoService.addComentario(id, body);
  }

  @Get('hallazgos/:id/historial')
  getHistorial(@Param('id') id: string) {
    return this.hallazgoService.getHistorial(id);
  }

  @Patch('hallazgos/:id/confianza-ia')
  updateConfianzaIA(
    @Param('id') id: string,
    @Body() body: { confianzaIA: number; notasRevisor?: string; userId: string },
  ) {
    return this.hallazgoService.updateConfianzaIA(id, body);
  }
}
