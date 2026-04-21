import { Module } from '@nestjs/common';
import { FideicomisoController } from './fideicomiso.controller';
import { FideicomisoService } from './fideicomiso.service';

@Module({
  controllers: [FideicomisoController],
  providers: [FideicomisoService],
  exports: [FideicomisoService],
})
export class FideicomisoModule {}
