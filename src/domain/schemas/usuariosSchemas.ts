import { z } from 'zod';

export const gestorUsuariosSchema = z.object({
  id: z.string().uuid(),
  cedula: z.string().min(6, 'Cédula inválida.'),
  nombresCompletos: z.string().min(3, 'Nombre debe tener al menos 3 caracteres.'),
  email: z.string().email('Correo electrónico inválido.'),
  telefono: z.string().min(7, 'Teléfono inválido.'),
  rol: z.enum(['COORDINADOR_PROVINCIAL', 'COORDINADOR_RECINTO', 'VEEDOR']),
  recintoId: z.string().uuid().nullable(),
  activo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const datosCrearUsuarioSchema = z.object({
  cedula: z.string().min(6, 'Cédula inválida.'),
  nombresCompletos: z.string().min(3, 'Nombre debe tener al menos 3 caracteres.'),
  email: z.string().email('Correo electrónico inválido.'),
  telefono: z.string().min(7, 'Teléfono inválido.'),
  rol: z.enum(['COORDINADOR_RECINTO', 'VEEDOR']),
  recintoId: z.string().uuid().optional(),
});

export const datosEditarUsuarioSchema = z
  .object({
    cedula: z.string().min(6, 'Cédula inválida.').optional(),
    nombresCompletos: z.string().min(3, 'Nombre debe tener al menos 3 caracteres.').optional(),
    email: z.string().email('Correo electrónico inválido.').optional(),
    telefono: z.string().min(7, 'Teléfono inválido.').optional(),
    rol: z.enum(['COORDINADOR_RECINTO', 'VEEDOR']).optional(),
    recintoId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo a editar.',
  });

export const editarNombreSchema = z.object({
  nuevoNombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres.'),
});
