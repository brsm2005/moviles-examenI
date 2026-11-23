import type { CoordenadasActa } from '../entities/Acta';

export interface ILocationService {
  obtenerUbicacionActual(): Promise<CoordenadasActa>;
}
