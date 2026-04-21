import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ConciliacionService } from './conciliacion.service';

@Controller()
export class ConciliacionController {
  constructor(private readonly conciliacionService: ConciliacionService) {}

  @Get('conciliaciones')
  findAll(
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conciliacionService.findAll({
      estado,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('fideicomisos/:fideicomisoId/conciliaciones')
  trigger(
    @Param('fideicomisoId') fideicomisoId: string,
    @Body() body: { periodo: string; tipo: string },
  ) {
    return this.conciliacionService.trigger(fideicomisoId, body);
  }

  @Get('fideicomisos/:fideicomisoId/conciliaciones')
  findByFideicomiso(
    @Param('fideicomisoId') fideicomisoId: string,
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conciliacionService.findByFideicomiso(fideicomisoId, {
      estado,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('conciliaciones/:id')
  findOne(@Param('id') id: string) {
    return this.conciliacionService.findOne(id);
  }

  @Get('conciliaciones/:id/resultados')
  getResultados(
    @Param('id') id: string,
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conciliacionService.getResultados(id, {
      estado,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
