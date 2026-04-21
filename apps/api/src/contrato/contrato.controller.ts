import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ContratoService } from './contrato.service';

@Controller()
export class ContratoController {
  constructor(private readonly contratoService: ContratoService) {}

  @Get('fideicomisos/:fideicomisoId/contratos')
  findByFideicomiso(
    @Param('fideicomisoId') fideicomisoId: string,
    @Query('tipo') tipo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contratoService.findByFideicomiso(fideicomisoId, {
      tipo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('fideicomisos/:fideicomisoId/contratos')
  create(
    @Param('fideicomisoId') fideicomisoId: string,
    @Body()
    body: {
      tipo: string;
      numero?: string;
      fechaFirma: string;
      fechaVigencia: string;
      partes: unknown;
      resumen?: string;
      documentoId?: string;
    },
  ) {
    return this.contratoService.create(fideicomisoId, body);
  }

  @Get('contratos/:id')
  findOne(@Param('id') id: string) {
    return this.contratoService.findOne(id);
  }

  @Get('contratos/:id/reglas')
  getReglas(@Param('id') id: string) {
    return this.contratoService.getReglas(id);
  }
}
