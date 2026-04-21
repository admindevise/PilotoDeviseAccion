import { Controller, Get, Param, Query } from '@nestjs/common';
import { FacturaService } from './factura.service';

@Controller('facturas')
export class FacturaController {
  constructor(private readonly facturaService: FacturaService) {}

  @Get()
  findAll(
    @Query('estado') estado?: string,
    @Query('fideicomisoId') fideicomisoId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.facturaService.findAll({
      estado,
      fideicomisoId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facturaService.findOne(id);
  }
}
