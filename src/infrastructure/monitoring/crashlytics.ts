import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { RolPerfil } from '@/domain/entities/Perfil';
import type { ContextoErrorOperativo, IDiagnosticoCrashReportingService } from '@/domain/ports/ICrashReportingService';

export class FirebaseCrashlyticsService implements IDiagnosticoCrashReportingService {
  private rol: RolPerfil | null = null;
  private cola: Promise<void> = Promise.resolve();

  establecerRol(rol: RolPerfil | null): void {
    this.rol = rol;
  }

  async inicializar(): Promise<void> {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return;
    }

    const { getCrashlytics } = await import('@react-native-firebase/crashlytics');
    getCrashlytics();
  }

  async registrarError(error: Error, contexto: ContextoErrorOperativo): Promise<void> {
    try {
      await this.registrarErrorDiagnostico(error, contexto);
    } catch (fallo) {
      console.error('[Crashlytics] No se pudo registrar el error operativo:', fallo, error, contexto);
    }
  }

  registrarErrorDiagnostico(error: Error, contexto: ContextoErrorOperativo): Promise<void> {
    const atributos = {
      rol: contexto.rol ?? this.rol ?? 'sin_sesion',
      pantalla: contexto.pantalla,
      operacion: contexto.operacion,
      acta_id: contexto.actaId ?? 'no_aplica',
    };

    const registro = this.cola.then(async () => {
      if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
        throw new Error('Crashlytics no está disponible en Expo Go; use una compilación nativa.');
      }

      const { getCrashlytics, setAttributes, recordError } = await import(
        '@react-native-firebase/crashlytics'
      );
      const crashlytics = getCrashlytics();
      if (!crashlytics.isCrashlyticsCollectionEnabled) {
        throw new Error('La recolección de Crashlytics está desactivada en esta compilación.');
      }
      await setAttributes(crashlytics, atributos);
      recordError(crashlytics, error);
    });

    this.cola = registro.catch(() => {});
    return registro;
  }

  async provocarCrash(contexto: ContextoErrorOperativo): Promise<void> {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      throw new Error('Crashlytics no está disponible en Expo Go; use una compilación nativa.');
    }

    const { getCrashlytics, setAttributes, crash } = await import(
      '@react-native-firebase/crashlytics'
    );
    const crashlytics = getCrashlytics();
    if (!crashlytics.isCrashlyticsCollectionEnabled) {
      throw new Error('La recolección de Crashlytics está desactivada en esta compilación.');
    }

    await setAttributes(crashlytics, {
      rol: contexto.rol ?? this.rol ?? 'sin_sesion',
      pantalla: contexto.pantalla,
      operacion: contexto.operacion,
      acta_id: contexto.actaId ?? 'no_aplica',
    });
    crash(crashlytics);
  }
}
