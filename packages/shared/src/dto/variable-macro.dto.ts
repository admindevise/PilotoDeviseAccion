import { z } from 'zod';

export const createValorHistoricoSchema = z.object({
  variableCode: z.string().min(1),
  valor: z.number(),
  vigenciaDesde: z.string().datetime(),
  vigenciaHasta: z.string().datetime().optional(),
  normaLegal: z.string().optional(),
});

export type CreateValorHistoricoDto = z.infer<typeof createValorHistoricoSchema>;
