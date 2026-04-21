-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'GERENTE_FIDEICOMISO', 'ANALISTA_CONTABLE', 'DIRECTOR_FINANCIERO', 'AUDITOR');

-- CreateEnum
CREATE TYPE "TipologiaFideicomiso" AS ENUM ('FA', 'MR', 'MG');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('CONTRATO_FIDUCIA', 'OTROSI_FIDUCIA', 'CONTRATO_PARALELO', 'OTROSI_PARALELO', 'CESION_DERECHOS');

-- CreateEnum
CREATE TYPE "TipoComision" AS ENUM ('ADMINISTRACION_MENSUAL', 'INICIAL_ESTRUCTURACION', 'CESION_DERECHOS', 'SUSCRIPCION_OTROSI', 'ASISTENCIA_COMITE', 'VARIABLE_MONETIZACION', 'COMISION_FONDOS', 'ACOMPANAMIENTO_PROCESAL', 'PRORROGA', 'OTRA');

-- CreateEnum
CREATE TYPE "PeriodicidadComision" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'POR_EVENTO', 'UNICA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CONTRATO_FIDUCIA', 'OTROSI_FIDUCIA', 'AUXILIAR_CONTABLE', 'ESTADO_CUENTA_COMISIONES', 'RENDICION_SEMESTRAL', 'CESION_DERECHOS', 'CORREO_ELECTRONICO', 'CONTRATO_PARALELO', 'OTROSI_PARALELO', 'ACTA_COMITE', 'INSTRUCCION_PAGO', 'OTRO');

-- CreateEnum
CREATE TYPE "FormatoOriginal" AS ENUM ('PDF', 'PDF_ZIP', 'MSG', 'EML', 'XLSX', 'XLS', 'TSV', 'CSV', 'DOCX');

-- CreateEnum
CREATE TYPE "OrigenERP" AS ENUM ('LEGACY', 'SIFI', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoConciliacion" AS ENUM ('EN_PROGRESO', 'COMPLETADA', 'ERROR');

-- CreateEnum
CREATE TYPE "EstadoResultado" AS ENUM ('CONCILIADO', 'DISCREPANCIA', 'NO_ENCONTRADO', 'NO_FACTURADO', 'OPORTUNIDAD_REVENUE', 'ANOMALIA');

-- CreateEnum
CREATE TYPE "TipoHallazgo" AS ENUM ('COMISION_NO_FACTURADA', 'COMISION_NO_RECAUDADA', 'DISCREPANCIA_MONTO', 'INCONSISTENCIA_FUENTES', 'PAGO_PARCIAL_INCOMPLETO', 'GAP_TEMPORAL', 'CESION_INCONSISTENTE', 'ANOMALIA_CONTABLE', 'OPORTUNIDAD_REVENUE', 'INFORMATIVO');

-- CreateEnum
CREATE TYPE "SeveridadHallazgo" AS ENUM ('CRITICO', 'ALTO', 'MEDIO', 'BAJO', 'INFORMATIVO');

-- CreateEnum
CREATE TYPE "CategoriaHallazgo" AS ENUM ('CONCILIACION', 'REVENUE', 'ANOMALIA', 'CONSISTENCIA');

-- CreateEnum
CREATE TYPE "EstadoHallazgo" AS ENUM ('ABIERTO', 'EN_GESTION', 'RESUELTO', 'DESCARTADO', 'EXCEPCION');

-- CreateEnum
CREATE TYPE "TipoResolucion" AS ENUM ('DESCARTADO', 'RESUELTO_CON_EXPLICACION', 'RESUELTO_CON_ADJUNTOS', 'GESTION_EXTERNA', 'ESCALADO', 'EXCEPCION_ACEPTADA');

-- CreateEnum
CREATE TYPE "PeriodicidadVariable" AS ENUM ('ANUAL', 'MENSUAL', 'DIARIA');

-- CreateEnum
CREATE TYPE "TipoConvencion" AS ENUM ('CONTABLE', 'COMERCIAL', 'OPERATIVA', 'REGISTRO', 'REGULATORIA');

-- CreateEnum
CREATE TYPE "TipoConocimiento" AS ENUM ('REGLA_NEGOCIO', 'RESOLUCION_HALLAZGO', 'CONTEXTO_OPERATIVO', 'PRECEDENTE_CONTABLE', 'DOCUMENTO_FUENTE');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CONSTITUCION', 'OTROSI', 'CESION', 'CAMBIO_CODIGO', 'CAMBIO_FIDEICOMITENTE', 'NUEVA_REGLA', 'ACTUALIZACION_DATOS', 'CONCILIACION_EJECUTADA', 'HALLAZGO_DETECTADO', 'HALLAZGO_RESUELTO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fideicomisos" (
    "id" TEXT NOT NULL,
    "codigoPrincipal" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fiduciariaAdmin" TEXT NOT NULL,
    "fechaConstitucion" TIMESTAMP(3) NOT NULL,
    "tipologia" "TipologiaFideicomiso" NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fideicomisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_fideicomiso" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "motivoCambio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_fideicomiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fideicomitentes" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "documentoFuente" TEXT,

    CONSTRAINT "fideicomitentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "tipo" "TipoContrato" NOT NULL,
    "numero" TEXT,
    "fechaFirma" TIMESTAMP(3) NOT NULL,
    "fechaVigencia" TIMESTAMP(3) NOT NULL,
    "partes" JSONB NOT NULL,
    "resumen" TEXT,
    "documentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_comision" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipo" "TipoComision" NOT NULL,
    "nombre" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "formulaDetalle" JSONB NOT NULL,
    "periodicidad" "PeriodicidadComision" NOT NULL,
    "condiciones" TEXT,
    "clausulaFuente" TEXT NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "confianzaExtraccion" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notaRevision" TEXT,
    "validada" BOOLEAN NOT NULL DEFAULT false,
    "validadaPor" TEXT,
    "validadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "formatoOriginal" "FormatoOriginal" NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaAlmacenamiento" TEXT NOT NULL,
    "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDocumento" TIMESTAMP(3),
    "contextoUsuario" TEXT,
    "textoExtraido" TEXT,
    "clasificacion" JSONB,
    "metadatos" JSONB,
    "procesado" BOOLEAN NOT NULL DEFAULT false,
    "cargadoPorId" TEXT NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_contables" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "documentoOrigenId" TEXT,
    "origenERP" "OrigenERP" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cuenta" TEXT NOT NULL,
    "nombreCuenta" TEXT,
    "terceroNit" TEXT,
    "terceroNombre" TEXT,
    "tipoComprobante" TEXT,
    "numeroComprobante" TEXT,
    "concepto" TEXT,
    "debito" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credito" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldo" DOUBLE PRECISION,
    "periodoContable" TEXT NOT NULL,
    "lineaOriginal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_contables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "numeroFactura" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "periodoContable" TEXT NOT NULL,
    "codigoSuper" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recaudos" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "referencia" TEXT,
    "medioPago" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recaudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliaciones" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" "EstadoConciliacion" NOT NULL DEFAULT 'EN_PROGRESO',
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadaEn" TIMESTAMP(3),
    "resumen" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciliaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultados_conciliacion" (
    "id" TEXT NOT NULL,
    "conciliacionId" TEXT NOT NULL,
    "reglaComisionId" TEXT,
    "periodo" TEXT NOT NULL,
    "estado" "EstadoResultado" NOT NULL,
    "montoEsperado" DOUBLE PRECISION,
    "montoRegistrado" DOUBLE PRECISION,
    "discrepancia" DOUBLE PRECISION,
    "confianza" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "evidencia" JSONB NOT NULL,
    "razonamiento" TEXT,
    "variableMacro" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resultados_conciliacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hallazgos" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "resultadoConciliacionId" TEXT,
    "tipo" "TipoHallazgo" NOT NULL,
    "severidad" "SeveridadHallazgo" NOT NULL,
    "categoria" "CategoriaHallazgo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "razonamiento" TEXT NOT NULL,
    "fuentes" JSONB NOT NULL,
    "reglaAplicada" JSONB,
    "variableMacro" JSONB,
    "impactoEconomico" DOUBLE PRECISION,
    "estado" "EstadoHallazgo" NOT NULL DEFAULT 'ABIERTO',
    "asignadoAId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hallazgos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resoluciones_hallazgo" (
    "id" TEXT NOT NULL,
    "hallazgoId" TEXT NOT NULL,
    "tipo" "TipoResolucion" NOT NULL,
    "explicacion" TEXT NOT NULL,
    "adjuntos" JSONB,
    "resueltoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resoluciones_hallazgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variables_macroeconomicas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodicidad" "PeriodicidadVariable" NOT NULL,
    "unidad" TEXT NOT NULL,
    "fuenteOficial" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variables_macroeconomicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valores_historicos_variable" (
    "id" TEXT NOT NULL,
    "variableId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "normaLegal" TEXT,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valores_historicos_variable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convenciones_fideicomiso" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "tipo" "TipoConvencion" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "parametros" JSONB,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "fuenteDocumental" TEXT,
    "registradoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convenciones_fideicomiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entradas_conocimiento" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "tipo" "TipoConocimiento" NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "metadatos" JSONB,
    "embedding" TEXT,
    "fuentes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entradas_conocimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_timeline" (
    "id" TEXT NOT NULL,
    "fideicomisoId" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "referenciaId" TEXT,
    "referenciaTipo" TEXT,
    "metadatos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "cambios" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fideicomisos_codigoPrincipal_key" ON "fideicomisos"("codigoPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_fideicomiso_codigo_key" ON "codigos_fideicomiso"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_documentoId_key" ON "contratos"("documentoId");

-- CreateIndex
CREATE INDEX "movimientos_contables_fideicomisoId_periodoContable_idx" ON "movimientos_contables"("fideicomisoId", "periodoContable");

-- CreateIndex
CREATE INDEX "movimientos_contables_fideicomisoId_cuenta_idx" ON "movimientos_contables"("fideicomisoId", "cuenta");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_fideicomisoId_numeroFactura_key" ON "facturas"("fideicomisoId", "numeroFactura");

-- CreateIndex
CREATE UNIQUE INDEX "hallazgos_resultadoConciliacionId_key" ON "hallazgos"("resultadoConciliacionId");

-- CreateIndex
CREATE INDEX "hallazgos_fideicomisoId_estado_idx" ON "hallazgos"("fideicomisoId", "estado");

-- CreateIndex
CREATE INDEX "hallazgos_fideicomisoId_categoria_idx" ON "hallazgos"("fideicomisoId", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "variables_macroeconomicas_codigo_key" ON "variables_macroeconomicas"("codigo");

-- CreateIndex
CREATE INDEX "valores_historicos_variable_variableId_vigenciaDesde_idx" ON "valores_historicos_variable"("variableId", "vigenciaDesde");

-- CreateIndex
CREATE INDEX "convenciones_fideicomiso_fideicomisoId_tipo_idx" ON "convenciones_fideicomiso"("fideicomisoId", "tipo");

-- CreateIndex
CREATE INDEX "entradas_conocimiento_fideicomisoId_tipo_idx" ON "entradas_conocimiento"("fideicomisoId", "tipo");

-- CreateIndex
CREATE INDEX "eventos_timeline_fideicomisoId_fecha_idx" ON "eventos_timeline"("fideicomisoId", "fecha");

-- CreateIndex
CREATE INDEX "audit_logs_entidad_entidadId_idx" ON "audit_logs"("entidad", "entidadId");

-- AddForeignKey
ALTER TABLE "codigos_fideicomiso" ADD CONSTRAINT "codigos_fideicomiso_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fideicomitentes" ADD CONSTRAINT "fideicomitentes_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cargadoPorId_fkey" FOREIGN KEY ("cargadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_contables" ADD CONSTRAINT "movimientos_contables_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recaudos" ADD CONSTRAINT "recaudos_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliaciones" ADD CONSTRAINT "conciliaciones_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_conciliacion" ADD CONSTRAINT "resultados_conciliacion_conciliacionId_fkey" FOREIGN KEY ("conciliacionId") REFERENCES "conciliaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultados_conciliacion" ADD CONSTRAINT "resultados_conciliacion_reglaComisionId_fkey" FOREIGN KEY ("reglaComisionId") REFERENCES "reglas_comision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hallazgos" ADD CONSTRAINT "hallazgos_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hallazgos" ADD CONSTRAINT "hallazgos_resultadoConciliacionId_fkey" FOREIGN KEY ("resultadoConciliacionId") REFERENCES "resultados_conciliacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hallazgos" ADD CONSTRAINT "hallazgos_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resoluciones_hallazgo" ADD CONSTRAINT "resoluciones_hallazgo_hallazgoId_fkey" FOREIGN KEY ("hallazgoId") REFERENCES "hallazgos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resoluciones_hallazgo" ADD CONSTRAINT "resoluciones_hallazgo_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valores_historicos_variable" ADD CONSTRAINT "valores_historicos_variable_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "variables_macroeconomicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convenciones_fideicomiso" ADD CONSTRAINT "convenciones_fideicomiso_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_conocimiento" ADD CONSTRAINT "entradas_conocimiento_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_timeline" ADD CONSTRAINT "eventos_timeline_fideicomisoId_fkey" FOREIGN KEY ("fideicomisoId") REFERENCES "fideicomisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
