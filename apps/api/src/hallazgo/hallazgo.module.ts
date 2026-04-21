import { Module } from '@nestjs/common';
import { HallazgoController } from './hallazgo.controller';
import { HallazgoService } from './hallazgo.service';

@Module({
  controllers: [HallazgoController],
  providers: [HallazgoService],
  exports: [HallazgoService],
})
export class HallazgoModule {}
