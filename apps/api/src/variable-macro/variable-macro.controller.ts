import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { VariableMacroService } from './variable-macro.service';

@Controller('variables-macro')
export class VariableMacroController {
  constructor(private readonly variableMacroService: VariableMacroService) {}

  @Get()
  findAll() {
    return this.variableMacroService.findAll();
  }

  @Get(':codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.variableMacroService.findByCodigo(codigo);
  }

  @Post(':codigo/valores')
  addValor(
    @Param('codigo') codigo: string,
    @Body()
    body: {
      valor: number;
      vigenciaDesde: string;
      vigenciaHasta?: string;
      normaLegal?: string;
      registradoPor?: string;
    },
  ) {
    return this.variableMacroService.addValor(codigo, body);
  }

  @Get(':codigo/valores')
  getValores(
    @Param('codigo') codigo: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.variableMacroService.getValores(codigo, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
