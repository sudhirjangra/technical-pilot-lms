import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'SUB_ADMIN', 'STUDENT']);

export type Role = z.infer<typeof roleSchema>;
