import type { Acta } from '../entities/Acta';
import type { Dignidad } from '../entities/Candidato';

export interface DatosAuditoriaCorreccion {
  motivo: string;
}

export interface IActaRemoteDataSource {
  listarSincronizadas(): Promise<Acta[]>;
  obtenerPorId(actaId: string): Promise<Acta | null>;
  obtenerParaMesa(mesaJrvId: string, dignidad: Dignidad): Promise<Acta | null>;
  guardarActa(
    acta: Acta,
    auditoria?: DatosAuditoriaCorreccion,
  ): Promise<string>;
}
