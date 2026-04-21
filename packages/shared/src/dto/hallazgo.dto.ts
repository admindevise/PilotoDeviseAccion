import { z } from 'zod';

export const resolveHallazgoSchema = z.object({
  tipo: z.enum([
    'DESCARTADO',
    'RESUELTO_CON_EXPLICACION',
    'RESUELTO_CON_ADJUNTOS',
    'GESTION_EXTERNA',
    'ESCALADO',
    'EXCEPCION_ACEPTADA',
  ]),
  explicacion: z.string().min(1),
});

export type ResolveHallazgoDto = z.infer<typeof resolveHallazgoSchema>;
