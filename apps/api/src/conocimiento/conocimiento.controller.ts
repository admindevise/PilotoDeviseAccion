import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ConocimientoService } from './conocimiento.service';

@Controller()
export class ConocimientoController {
  constructor(private readonly conocimientoService: ConocimientoService) {}

  @Get('fideicomisos/:fideicomisoId/conocimiento')
  findByFideicomiso(
    @Param('fideicomisoId') fideicomisoId: string,
    @Query('tipo') tipo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conocimientoService.findByFideicomiso(fideicomisoId, {
      tipo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('fideicomisos/:fideicomisoId/conocimiento')
  create(
    @Param('fideicomisoId') fideicomisoId: string,
    @Body()
    body: {
      tipo: string;
      titulo: string;
      contenido: string;
      metadatos?: unknown;
      fuentes?: unknown;
    },
  ) {
    return this.conocimientoService.create(fideicomisoId, body);
  }

  @Get('conocimiento/search')
  search(
    @Query('q') q: string,
    @Query('fideicomisoId') fideicomisoId?: string,
    @Query('tipo') tipo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conocimientoService.search({
      q,
      fideicomisoId,
      tipo,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
