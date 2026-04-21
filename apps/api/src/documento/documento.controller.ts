import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentoService } from './documento.service';

@Controller()
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) {}

  @Post('fideicomisos/:fideicomisoId/documentos')
  upload(
    @Param('fideicomisoId') fideicomisoId: string,
    @Body()
    body: {
      tipo: string;
      formatoOriginal: string;
      nombreArchivo: string;
      rutaAlmacenamiento: string;
      fechaDocumento?: string;
      contextoUsuario?: string;
      cargadoPorId: string;
    },
  ) {
    return this.documentoService.upload(fideicomisoId, body);
  }

  @Get('fideicomisos/:fideicomisoId/documentos')
  findByFideicomiso(
    @Param('fideicomisoId') fideicomisoId: string,
    @Query('tipo') tipo?: string,
    @Query('procesado') procesado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentoService.findByFideicomiso(fideicomisoId, {
      tipo,
      procesado,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('documentos')
  findAll(
    @Query('fideicomisoId') fideicomisoId?: string,
    @Query('tipo') tipo?: string,
    @Query('procesado') procesado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentoService.findAll({
      fideicomisoId,
      tipo,
      procesado: procesado ? procesado === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('documentos/:id')
  findOne(@Param('id') id: string) {
    return this.documentoService.findOne(id);
  }

  @Get('documentos/:id/file')
  async getFile(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { stream, filename, mimetype } = await this.documentoService.getFileStream(id);
    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }
}
