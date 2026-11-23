import * as Location from 'expo-location';
import type { CoordenadasActa } from '@/domain/entities/Acta';
import type { ILocationService } from '@/domain/ports/ILocationService';

export class ExpoLocationService implements ILocationService {
  async prepararCaptura(): Promise<void> {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) {
      throw new Error(
        'Active el permiso de ubicación para registrar el lugar de la captura.',
      );
    }
  }

  async obtenerUbicacionActual(): Promise<CoordenadasActa> {
    const posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitud: posicion.coords.latitude,
      longitud: posicion.coords.longitude,
      precisionMetros: posicion.coords.accuracy,
      capturadaEn: new Date(posicion.timestamp).toISOString(),
    };
  }
}
