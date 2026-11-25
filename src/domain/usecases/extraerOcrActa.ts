import type { Acta, VerificacionTerritorial } from '../entities/Acta';
import type { IActaOcrService } from '../ports/IActaOcrService';
import type { Candidato } from '../entities/Candidato';

export async function extraerOcrActa(
  acta: Acta,
  fotoUri: string,
  ocr: IActaOcrService,
  candidatos: Candidato[],
): Promise<Pick<Acta, 'totalSufragantes' | 'votosBlancos' | 'votosNulos' | 'votosCandidatos' | 'verificacionTerritorial'>> {
  const lectura = await ocr.extraerVotos(fotoUri, acta.dignidad, candidatos);
  return {
    totalSufragantes: lectura.totalSufragantes,
    votosBlancos: lectura.votosBlancos,
    votosNulos: lectura.votosNulos,
    votosCandidatos: lectura.votosCandidatos,
    verificacionTerritorial: 'NO_VERIFICABLE',
  };
}

export function exigirTerritorioVerificado(estado: VerificacionTerritorial | null): void {
  if (!estado) {
    throw new Error('No se pudo procesar el acta. Vuelva a tomar una fotografía del acta.');
  }
}
