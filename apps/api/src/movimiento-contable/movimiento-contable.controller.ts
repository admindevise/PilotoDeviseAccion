import { Controller, Get, Param, Query } from '@nestjs/common';
import { MovimientoContableService } from './movimiento-contable.service';

@Controller('movimientos-contables')
export class MovimientoContableController {
  constructor(private readonly movimientoContableService: MovimientoContableService) {}

  @Get()
  findAll(
    @Query('fideicomisoId') fideicomisoId?: string,
    @Query('periodoContable') periodoContable?: string,
    @Query('cuenta') cuenta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.movimientoContableService.findAll({
      fideicomisoId,
      periodoContable,
      cuenta,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.movimientoContableService.findOne(id);
  }
}
