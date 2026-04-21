import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { FideicomisoService } from './fideicomiso.service';

@Controller('fideicomisos')
export class FideicomisoController {
  constructor(private readonly fideicomisoService: FideicomisoService) {}

  @Get()
  findAll(
    @Query('estado') estado?: string,
    @Query('tipologia') tipologia?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fideicomisoService.findAll({
      estado,
      tipologia,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fideicomisoService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      codigoPrincipal: string;
      nombre: string;
      fiduciariaAdmin: string;
      fechaConstitucion: string;
      tipologia: string;
      descripcion?: string;
    },
  ) {
    return this.fideicomisoService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.fideicomisoService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fideicomisoService.remove(id);
  }

  @Post(':id/codigos')
  addCodigo(
    @Param('id') id: string,
    @Body()
    body: {
      codigo: string;
      tipo?: string;
      vigenciaDesde: string;
      vigenciaHasta?: string;
      motivoCambio?: string;
    },
  ) {
    return this.fideicomisoService.addCodigo(id, body);
  }

  @Get(':id/timeline')
  getTimeline(
    @Param('id') id: string,
    @Query('tipo') tipo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fideicomisoService.getTimeline(id, {
      tipo,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
