import { z } from 'zod';

export const createFideicomisoSchema = z.object({
  codigoPrincipal: z.string().min(1),
  nombre: z.string().min(1),
  fiduciariaAdmin: z.string().min(1),
  fechaConstitucion: z.string().datetime(),
  tipologia: z.enum(['FA', 'MR', 'MG']),
  descripcion: z.string().optional(),
});

export type CreateFideicomisoDto = z.infer<typeof createFideicomisoSchema>;

export const updateFideicomisoSchema = createFideicomisoSchema.partial();

export type UpdateFideicomisoDto = z.infer<typeof updateFideicomisoSchema>;
