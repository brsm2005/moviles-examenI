import Constants from 'expo-constants';
import type { RolPerfil } from '@/domain/entities/Perfil';
import type { ContextoErrorOperativo, ICrashReportingService } from '@/domain/ports/ICrashReportingService';

export class FirebaseCrashlyticsService implements ICrashReportingService {
  private rol: RolPerfil | null = null;
  private cola: Promise<void> = Promise.resolve();

  establecerRol(rol: RolPerfil | null): void {
    this.rol = rol;
  }

  registrarError(error: Error, contexto: ContextoErrorOperativo): Promise<void> {
    const atributos = {
      rol: contexto.rol ?? this.rol ?? 'sin_sesion',
      pantalla: contexto.pantalla,
      operacion: contexto.operacion,
      acta_id: contexto.actaId ?? 'no_aplica',
    };
    const registro = this.cola.then(async () => {
      if (Constants.appOwnership === 'expo') {
        console.error('Error operativo:', error, atributos);
        return;
      }

      const { getCrashlytics, recordError, setAttributes } =
        await import('@react-native-firebase/crashlytics');
      const instancia = getCrashlytics();
      await setAttributes(instancia, atributos);
      recordError(instancia, error);
    });
    this.cola = registro.catch((fallo: unknown) => {
      console.error('No se pudo registrar el error en Crashlytics:', fallo);
    });
    return registro;
  }
}
