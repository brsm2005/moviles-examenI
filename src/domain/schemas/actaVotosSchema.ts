import { z } from 'zod';

const votoCandidatoSchema = z.object({
  candidatoId: z.string().min(1, 'El candidato es obligatorio.'),
  votos: z.number().int().min(0).nullable(),
});

const camposVotosActaSchema = z.object({
  totalSufragantes: z.number().int().min(0).nullable(),
  votosBlancos: z.number().int().min(0).nullable(),
  votosNulos: z.number().int().min(0).nullable(),
  votosCandidatos: z.array(votoCandidatoSchema).length(
    5,
    'El acta debe incluir los votos de los cinco candidatos.',
  ),
});

function validarVotosActa(
  acta: z.infer<typeof camposVotosActaSchema>,
  contexto: z.RefinementCtx,
  exigirCompleta: boolean,
) {
  const candidatosUnicos = new Set(
    acta.votosCandidatos.map(({ candidatoId }) => candidatoId),
  );

  if (candidatosUnicos.size !== acta.votosCandidatos.length) {
    contexto.addIssue({
      code: 'custom',
      path: ['votosCandidatos'],
      message: 'Cada candidato debe aparecer una sola vez.',
    });
  }

  if (acta.totalSufragantes !== null) {
    acta.votosCandidatos.forEach(({ votos }, indice) => {
      if (votos !== null && votos > acta.totalSufragantes!) {
        contexto.addIssue({
          code: 'custom',
          path: ['votosCandidatos', indice, 'votos'],
          message: 'Los votos de un candidato no pueden superar el total de sufragantes.',
        });
      }
    });
  }

  const valoresCompletos =
    acta.totalSufragantes !== null &&
    acta.votosBlancos !== null &&
    acta.votosNulos !== null &&
    acta.votosCandidatos.every(({ votos }) => votos !== null);

  if (!valoresCompletos) {
    if (exigirCompleta) {
      contexto.addIssue({
        code: 'custom',
        path: ['totalSufragantes'],
        message: 'Complete todos los valores antes de confirmar el acta.',
      });
    }
    return;
  }

  const sumaVotos =
    acta.votosCandidatos.reduce((total, candidato) => total + candidato.votos!, 0) +
    acta.votosBlancos! +
    acta.votosNulos!;

  if (sumaVotos !== acta.totalSufragantes) {
    contexto.addIssue({
      code: 'custom',
      path: ['totalSufragantes'],
      message: 'La suma de votos de candidatos, blancos y nulos debe igualar el total de sufragantes.',
    });
  }
}

export const actaVotosOcrSchema = camposVotosActaSchema.superRefine(
  (acta, contexto) => validarVotosActa(acta, contexto, false),
);

export const actaVotosConfirmacionSchema = camposVotosActaSchema.superRefine(
  (acta, contexto) => validarVotosActa(acta, contexto, true),
);

export type VotosActaOcr = z.infer<typeof actaVotosOcrSchema>;
export type VotosActaConfirmacion = z.infer<typeof actaVotosConfirmacionSchema>;
