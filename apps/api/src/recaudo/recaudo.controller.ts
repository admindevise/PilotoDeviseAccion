import { Controller, Get, Param, Query } from '@nestjs/common';
import { RecaudoService } from './recaudo.service';

@Controller('recaudos')
export class RecaudoController {
  constructor(private readonly recaudoService: RecaudoService) {}

  @Get()
  findAll(
    @Query('facturaId') facturaId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recaudoService.findAll({
      facturaId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recaudoService.findOne(id);
  }
}
