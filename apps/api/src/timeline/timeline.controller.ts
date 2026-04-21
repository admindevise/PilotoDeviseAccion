import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Controller()
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get('fideicomisos/:fideicomisoId/timeline')
  findByFideicomiso(
    @Param('fideicomisoId') fideicomisoId: string,
    @Query('tipo') tipo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timelineService.findByFideicomiso(fideicomisoId, {
      tipo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('fideicomisos/:fideicomisoId/timeline')
  create(
    @Param('fideicomisoId') fideicomisoId: string,
    @Body()
    body: {
      tipo: string;
      titulo: string;
      descripcion?: string;
      fecha?: string;
      referenciaId?: string;
      referenciaTipo?: string;
    },
  ) {
    return this.timelineService.create(fideicomisoId, body);
  }
}
