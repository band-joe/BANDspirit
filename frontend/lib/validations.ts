import { z } from 'zod';

// SEC-003: Passwort-Komplexitätsregeln
export const passwordSchema = z.string()
  .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
  .max(128, 'Passwort darf maximal 128 Zeichen lang sein')
  .refine(v => /[A-Z]/.test(v), 'Mindestens 1 Großbuchstabe erforderlich')
  .refine(v => /[a-z]/.test(v), 'Mindestens 1 Kleinbuchstabe erforderlich')
  .refine(v => /[0-9]/.test(v), 'Mindestens 1 Zahl erforderlich')
  .refine(v => /[^A-Za-z0-9]/.test(v), 'Mindestens 1 Sonderzeichen erforderlich');

export const userSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100, 'Name zu lang'),
  email: z.string().email('Ungültige E-Mail-Adresse').max(150, 'E-Mail zu lang'),
  password: passwordSchema.optional(),
  role: z.enum(['ADMIN', 'FALLMANAGER', 'EINSATZPLANER', 'TEAMLEITUNG']).optional(),
  aktiv: z.boolean().optional(),
});
