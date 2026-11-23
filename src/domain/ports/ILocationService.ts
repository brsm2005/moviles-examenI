import type { CoordenadasActa } from '../entities/Acta';

export interface ILocationService {
  prepararCaptura(): Promise<void>;
  obtenerUbicacionActual(): Promise<CoordenadasActa>;
}
