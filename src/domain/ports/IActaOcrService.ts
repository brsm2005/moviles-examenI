import type { Candidato, Dignidad } from '../entities/Candidato';
import type { VotoCandidato } from '../entities/VotoCandidato';

export interface ResultadoOcrActa {
  provinciaLeida: string | null;
  cantonLeido: string | null;
  totalSufragantes: number | null;
  votosBlancos: number | null;
  votosNulos: number | null;
  votosCandidatos: VotoCandidato[];
}

export interface IActaOcrService {
  extraerVotos(
    fotoUri: string,
    dignidad: Dignidad,
    candidatos: Candidato[],
    territorio: { provincia: string; canton: string },
  ): Promise<ResultadoOcrActa>;
}
