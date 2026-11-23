import type { Dignidad } from './Candidato';
import type { VotoCandidato } from './VotoCandidato';

export type EstadoActa =
  | 'PENDING_OCR'
  | 'PROCESSING_OCR'
  | 'NEEDS_CONFIRMATION'
  | 'PENDING_SYNC'
  | 'SYNCED';

export interface CoordenadasActa {
  latitud: number;
  longitud: number;
  precisionMetros: number | null;
  capturadaEn: string;
}

export interface Acta {
  id: string;
  mesaJrvId: string;
  dignidad: Dignidad;
  estado: EstadoActa;
  fotoUri: string;
  fotoStoragePath: string | null;
  ubicacion: CoordenadasActa | null;
  alertaUbicacion: boolean;
  totalSufragantes: number | null;
  votosBlancos: number | null;
  votosNulos: number | null;
  votosCandidatos: VotoCandidato[];
  creadoPor: string;
  actualizadoPor: string;
  creadoEn: string;
  actualizadoEn: string;
}

const transicionesActa: Record<EstadoActa, EstadoActa[]> = {
  PENDING_OCR: ['PROCESSING_OCR'],
  PROCESSING_OCR: ['NEEDS_CONFIRMATION', 'PENDING_OCR'],
  NEEDS_CONFIRMATION: ['PENDING_SYNC'],
  PENDING_SYNC: ['SYNCED'],
  SYNCED: ['PENDING_SYNC'],
};

export function puedeTransicionarEstadoActa(
  estadoActual: EstadoActa,
  nuevoEstado: EstadoActa,
): boolean {
  return transicionesActa[estadoActual].includes(nuevoEstado);
}

export function transicionarEstadoActa(
  acta: Acta,
  nuevoEstado: EstadoActa,
): Acta {
  if (!puedeTransicionarEstadoActa(acta.estado, nuevoEstado)) {
    throw new Error(
      `Transición de acta no permitida: ${acta.estado} -> ${nuevoEstado}.`,
    );
  }

  return { ...acta, estado: nuevoEstado };
}
