import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ConvencionService } from './convencion.service';

@Controller()
export class ConvencionController {
  constructor(private readonly convencionService: ConvencionService) {}

  @Get('fideicomisos/:fideicomisoId/convenciones')
  findByFideicomiso(
    @Param('fideicomisoId') fideicomisoId: string,
    @Query('tipo') tipo?: string,
    @Query('vigente') vigente?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.convencionService.findByFideicomiso(fideicomisoId, {
      tipo,
      vigente,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('fideicomisos/:fideicomisoId/convenciones')
  create(
    @Param('fideicomisoId') fideicomisoId: string,
    @Body()
    body: {
      tipo: string;
      nombre: string;
      descripcion: string;
      parametros?: unknown;
      vigenciaDesde: string;
      vigenciaHasta?: string;
      fuenteDocumental?: string;
      registradoPor: string;
    },
  ) {
    return this.convencionService.create(fideicomisoId, body);
  }

  @Patch('convenciones/:id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.convencionService.update(id, body);
  }
}
