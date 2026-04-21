import { Module } from '@nestjs/common';
import { VariableMacroController } from './variable-macro.controller';
import { VariableMacroService } from './variable-macro.service';

@Module({
  controllers: [VariableMacroController],
  providers: [VariableMacroService],
  exports: [VariableMacroService],
})
export class VariableMacroModule {}
