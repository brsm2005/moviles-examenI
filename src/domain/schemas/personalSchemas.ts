import { z } from 'zod';

// Validación para crear personal subordinado
export const crearPersonalSchema = z.object({
  cedula: z
    .string()
    .min(8, 'Cédula debe tener al menos 8 dígitos')
    .max(10, 'Cédula no puede exceder 10 dígitos')
    .regex(/^\d+$/, 'Cédula solo debe contener números'),
  nombresCompletos: z
    .string()
    .min(3, 'Nombres deben tener al menos 3 caracteres')
    .max(100, 'Nombres no pueden exceder 100 caracteres'),
  telefono: z
    .string()
    .min(7, 'Teléfono debe tener al menos 7 dígitos')
    .max(15, 'Teléfono no puede exceder 15 dígitos')
    .regex(/^[\d\s\-\+()]*$/, 'Teléfono contiene caracteres inválidos'),
  email: z
    .string()
    .email('Correo inválido'),
  password: z
    .string()
    .min(10, 'Contraseña debe tener al menos 10 caracteres')
    .regex(/[A-Z]/, 'Contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Contraseña debe contener al menos un número')
    .regex(/[!@#$%^&*]/, 'Contraseña debe contener al menos un símbolo (!@#$%^&*)'),
});

// Validación para actualizar nombre y teléfono
export const actualizarPersonalSchema = z.object({
  id: z.string().uuid('ID inválido'),
  nombresCompletos: z
    .string()
    .min(3, 'Nombres deben tener al menos 3 caracteres')
    .max(100, 'Nombres no pueden exceder 100 caracteres')
    .optional(),
  telefono: z
    .string()
    .min(7, 'Teléfono debe tener al menos 7 dígitos')
    .max(15, 'Teléfono no puede exceder 15 dígitos')
    .regex(/^[\d\s\-\+()]*$/, 'Teléfono contiene caracteres inválidos')
    .optional(),
}).refine(
  (data) => data.nombresCompletos !== undefined || data.telefono !== undefined,
  'Al menos un campo debe ser proporcionado para actualizar',
);

export type CrearPersonalInput = z.input<typeof crearPersonalSchema>;
export type ActualizarPersonalInput = z.input<typeof actualizarPersonalSchema>;
