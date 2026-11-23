import { z } from 'zod';

const cedulaEcuatorianaSchema = z
  .string()
  .regex(/^\d{10}$/, 'La cédula debe tener exactamente 10 dígitos.')
  .refine((cedula) => {
    const provincia = Number(cedula.slice(0, 2));
    const tercerDigito = Number(cedula[2]);

    if (provincia < 1 || provincia > 24 || tercerDigito > 5) {
      return false;
    }

    const suma = Array.from(cedula.slice(0, 9), (digito, indice) => {
      const valor = Number(digito);
      if (indice % 2 === 1) {
        return valor;
      }

      const doble = valor * 2;
      return doble > 9 ? doble - 9 : doble;
    }).reduce((total, valor) => total + valor, 0);

    const verificador = (10 - (suma % 10)) % 10;
    return verificador === Number(cedula[9]);
  }, 'La cédula ecuatoriana no es válida.');

const nombresCompletosSchema = z
  .string()
  .trim()
  .min(3, 'Ingrese los nombres completos.')
  .max(150, 'Los nombres no pueden superar 150 caracteres.')
  .regex(
    /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u,
    'Use letras, espacios, apóstrofes o guiones.',
  );

const telefonoEcuatorianoSchema = z
  .string()
  .trim()
  .regex(
    /^(?:0[2-7]\d{7}|09\d{8}|\+593[2-7]\d{7}|\+5939\d{8})$/,
    'Ingrese un teléfono ecuatoriano válido.',
  );

export const perfilSchema = z.object({
  cedula: cedulaEcuatorianaSchema,
  nombresCompletos: nombresCompletosSchema,
  telefono: telefonoEcuatorianoSchema,
  email: z
    .string()
    .trim()
    .pipe(z.email('Ingrese un correo electrónico válido.')),
});

export type DatosPerfilValidados = z.infer<typeof perfilSchema>;
