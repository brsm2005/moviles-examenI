import type { Acta, EstadoActa } from '../entities/Acta';
import type { Dignidad } from '../entities/Candidato';

export interface IActaLocalDataSource {
  guardar(acta: Acta): Promise<void>;
  obtenerPorId(actaId: string): Promise<Acta | null>;
  listarPorEstado(estados: EstadoActa[], usuarioId?: string): Promise<Acta[]>;
  actualizar(acta: Acta): Promise<void>;
  obtenerParaMesa(mesaJrvId: string, dignidad: Dignidad): Promise<Acta | null>;
}
