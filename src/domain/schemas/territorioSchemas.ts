import { z } from 'zod';

export const nuevoRecintoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'Ingrese el nombre del recinto.')
    .max(150, 'El nombre no puede superar 150 caracteres.'),
  canton: z
    .string()
    .trim()
    .min(2, 'Ingrese el cantón.')
    .max(100, 'El cantón no puede superar 100 caracteres.'),
  parroquia: z
    .string()
    .trim()
    .min(2, 'Ingrese la parroquia.')
    .max(100, 'La parroquia no puede superar 100 caracteres.'),
  direccion: z
    .string()
    .trim()
    .max(200, 'La dirección no puede superar 200 caracteres.'),
});
