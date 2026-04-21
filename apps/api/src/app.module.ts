import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { FideicomisoModule } from './fideicomiso/fideicomiso.module';
import { ContratoModule } from './contrato/contrato.module';
import { DocumentoModule } from './documento/documento.module';
import { ConciliacionModule } from './conciliacion/conciliacion.module';
import { HallazgoModule } from './hallazgo/hallazgo.module';
import { VariableMacroModule } from './variable-macro/variable-macro.module';
import { ConvencionModule } from './convencion/convencion.module';
import { ConocimientoModule } from './conocimiento/conocimiento.module';
import { RevenueModule } from './revenue/revenue.module';
import { TimelineModule } from './timeline/timeline.module';
import { FacturaModule } from './factura/factura.module';
import { MovimientoContableModule } from './movimiento-contable/movimiento-contable.module';
import { RecaudoModule } from './recaudo/recaudo.module';
import { UserModule } from './user/user.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    PrismaModule,
    FideicomisoModule,
    ContratoModule,
    DocumentoModule,
    ConciliacionModule,
    HallazgoModule,
    VariableMacroModule,
    ConvencionModule,
    ConocimientoModule,
    RevenueModule,
    TimelineModule,
    FacturaModule,
    MovimientoContableModule,
    RecaudoModule,
    UserModule,
    AuditLogModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
  ],
})
export class AppModule {}
