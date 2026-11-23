import { z } from 'zod';
import { perfilSchema } from './perfilSchema';

export const inicioSesionSchema = z.object({
  email: z.string().trim().pipe(z.email('Ingrese un correo válido.')),
  password: z.string().min(1, 'Ingrese su contraseña.'),
});

export const cambioContrasenaSchema = z
  .object({
    password: z
      .string()
      .min(10, 'La contraseña debe tener al menos 10 caracteres.')
      .max(72, 'La contraseña no puede superar 72 caracteres.'),
    confirmarPassword: z.string().min(1, 'Confirme la nueva contraseña.'),
  })
  .refine((datos) => datos.password === datos.confirmarPassword, {
    path: ['confirmarPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export const recuperacionContrasenaSchema = z.object({
  email: z.string().trim().pipe(z.email('Ingrese un correo válido.')),
});

export const registroSubordinadoSchema = perfilSchema.extend({
  password: z
    .string()
    .min(10, 'La contraseña temporal debe tener al menos 10 caracteres.')
    .max(72, 'La contraseña no puede superar 72 caracteres.'),
  rol: z.enum(['COORDINADOR_RECINTO', 'VEEDOR']),
});

export const perfilAutenticadoSchema = z.object({
  id: z.uuid(),
  cedula: z.string(),
  nombresCompletos: z.string(),
  telefono: z.string(),
  email: z.email(),
  rol: z.enum([
    'COORDINADOR_PROVINCIAL',
    'COORDINADOR_RECINTO',
    'VEEDOR',
  ]),
  recintoId: z.uuid().nullable(),
  mustChangePassword: z.boolean(),
  correoConfirmado: z.boolean(),
});
