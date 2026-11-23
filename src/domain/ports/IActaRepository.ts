import type { Acta, EstadoActa } from '../entities/Acta';
import type { Dignidad } from '../entities/Candidato';

export interface CrearActaInput extends Omit<Acta, 'estado'> {
  estado?: Extract<EstadoActa, 'PENDING_OCR'>;
}

export interface IActaRepository {
  guardarCaptura(acta: CrearActaInput): Promise<void>;
  obtenerPorId(actaId: string): Promise<Acta | null>;
  listarPorEstado(estados: EstadoActa[]): Promise<Acta[]>;
  actualizarExtraccionOcr(
    actaId: string,
    votos: Pick<Acta, 'totalSufragantes' | 'votosBlancos' | 'votosNulos' | 'votosCandidatos'>,
  ): Promise<void>;
  confirmarParaSincronizacion(
    actaId: string,
    resultados: Pick<Acta, 'totalSufragantes' | 'votosBlancos' | 'votosNulos' | 'votosCandidatos'>,
    actualizadoPor: string,
  ): Promise<void>;
  actualizarAlertaUbicacion(actaId: string, alertaUbicacion: boolean): Promise<void>;
  marcarSincronizada(actaId: string): Promise<void>;
  obtenerParaMesa(mesaJrvId: string, dignidad: Dignidad): Promise<Acta | null>;
}
