import type { Acta, VerificacionTerritorial } from '../entities/Acta';
import type { IActaOcrService } from '../ports/IActaOcrService';
import type { ITerritorioRepository } from '../ports/ITerritorioRepository';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export async function extraerOcrActa(
  acta: Acta,
  fotoUri: string,
  territorio: ITerritorioRepository,
  ocr: IActaOcrService,
): Promise<Pick<Acta, 'totalSufragantes' | 'votosBlancos' | 'votosNulos' | 'votosCandidatos' | 'verificacionTerritorial'>> {
  const recinto = await territorio.obtenerRecintoPorMesa(acta.mesaJrvId);
  if (!recinto?.provincia.trim() || !recinto.canton.trim()) {
    throw new Error('No se encontró la provincia y el cantón de la mesa. Actualice el catálogo territorial.');
  }
  const candidatos = await territorio.obtenerCandidatosPorIds(
    acta.votosCandidatos.map((voto) => voto.candidatoId),
  );
  const lectura = await ocr.extraerVotos(fotoUri, acta.dignidad, candidatos, {
    provincia: recinto.provincia,
    canton: recinto.canton,
  });
  let verificacionTerritorial: VerificacionTerritorial = 'NO_VERIFICABLE';
  const provinciaLeida = lectura.provinciaLeida?.trim();
  const cantonLeido = lectura.cantonLeido?.trim();
  if (
    (provinciaLeida && normalizar(provinciaLeida) !== normalizar(recinto.provincia)) ||
    (cantonLeido && normalizar(cantonLeido) !== normalizar(recinto.canton))
  ) {
    verificacionTerritorial = 'NO_COINCIDE';
  } else if (provinciaLeida && cantonLeido) {
    verificacionTerritorial = 'COINCIDE';
  }
  return {
    totalSufragantes: lectura.totalSufragantes,
    votosBlancos: lectura.votosBlancos,
    votosNulos: lectura.votosNulos,
    votosCandidatos: lectura.votosCandidatos,
    verificacionTerritorial,
  };
}

export function exigirTerritorioVerificado(estado: VerificacionTerritorial | null): void {
  if (estado === 'NO_COINCIDE') {
    throw new Error('El acta pertenece a otra provincia o cantón. Tome una fotografía del acta correcta.');
  }
  if (estado !== 'COINCIDE') {
    throw new Error('No se pudo verificar la provincia y el cantón del acta. Vuelva a procesar una fotografía legible.');
  }
}
