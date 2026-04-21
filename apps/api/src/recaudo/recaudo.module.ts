import { Module } from '@nestjs/common';
import { RecaudoController } from './recaudo.controller';
import { RecaudoService } from './recaudo.service';

@Module({
  controllers: [RecaudoController],
  providers: [RecaudoService]
})
export class RecaudoModule {}
