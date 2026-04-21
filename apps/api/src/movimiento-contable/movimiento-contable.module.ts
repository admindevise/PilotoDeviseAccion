import { Module } from '@nestjs/common';
import { MovimientoContableController } from './movimiento-contable.controller';
import { MovimientoContableService } from './movimiento-contable.service';

@Module({
  controllers: [MovimientoContableController],
  providers: [MovimientoContableService]
})
export class MovimientoContableModule {}
