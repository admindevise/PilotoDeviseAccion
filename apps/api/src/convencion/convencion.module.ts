import { Module } from '@nestjs/common';
import { ConvencionController } from './convencion.controller';
import { ConvencionService } from './convencion.service';

@Module({
  controllers: [ConvencionController],
  providers: [ConvencionService],
  exports: [ConvencionService],
})
export class ConvencionModule {}
