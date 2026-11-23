import { z } from 'zod';

const numeroEntero = z
  .string()
  .trim()
  .min(1, 'Complete todos los valores antes de continuar.')
  .regex(/^\d+$/, 'Use únicamente números enteros positivos.')
  .transform(Number)
  .refine(Number.isSafeInteger, 'El valor está fuera del rango permitido.');

const camposActaVerificacionSchema = z.object({
  totalSufragantes: numeroEntero,
  votosBlancos: numeroEntero,
  votosNulos: numeroEntero,
  votosCandidatos: z
    .array(
      z.object({
        candidatoId: z.string().min(1),
        votos: numeroEntero,
      }),
    )
    .length(5, 'El acta debe incluir los votos de los cinco candidatos.'),
});

export const actaVerificacionSchema = camposActaVerificacionSchema.superRefine(
  (acta, contexto) => {
    const ids = new Set(acta.votosCandidatos.map((voto) => voto.candidatoId));
    if (ids.size !== acta.votosCandidatos.length) {
      contexto.addIssue({
        code: 'custom',
        path: ['votosCandidatos'],
        message: 'Cada candidato debe aparecer una sola vez.',
      });
    }

    acta.votosCandidatos.forEach((voto, indice) => {
      if (voto.votos > acta.totalSufragantes) {
        contexto.addIssue({
          code: 'custom',
          path: ['votosCandidatos', indice, 'votos'],
          message: 'Los votos de un candidato no pueden superar el total de sufragantes.',
        });
      }
    });

    const sumaVotos =
      acta.votosCandidatos.reduce((total, voto) => total + voto.votos, 0) +
      acta.votosBlancos +
      acta.votosNulos;

    if (sumaVotos !== acta.totalSufragantes) {
      contexto.addIssue({
        code: 'custom',
        path: ['totalSufragantes'],
        message: `El detalle suma ${sumaVotos} votos, pero el total de sufragantes es ${acta.totalSufragantes}.`,
      });
    }
  },
);

export type ActaVerificacionInput = z.input<typeof actaVerificacionSchema>;
export type ActaVerificacion = z.output<typeof actaVerificacionSchema>;
