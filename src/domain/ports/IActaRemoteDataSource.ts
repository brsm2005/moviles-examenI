import type { Acta } from '../entities/Acta';

export interface DatosAuditoriaCorreccion {
  motivo: string;
}

export interface IActaRemoteDataSource {
  listarSincronizadas(): Promise<Acta[]>;
  obtenerPorId(actaId: string): Promise<Acta | null>;
  guardarActa(
    acta: Acta,
    auditoria?: DatosAuditoriaCorreccion,
  ): Promise<string>;
}
