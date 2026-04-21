import { z } from 'zod';

export const uploadDocumentoSchema = z.object({
  fideicomisoId: z.string().uuid(),
  contextoUsuario: z.string().optional(),
  fechaDocumento: z.string().datetime().optional(),
});

export type UploadDocumentoDto = z.infer<typeof uploadDocumentoSchema>;
