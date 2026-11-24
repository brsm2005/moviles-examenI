import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { RolPerfil } from '@/domain/entities/Perfil';
import type { ContextoErrorOperativo, ICrashReportingService } from '@/domain/ports/ICrashReportingService';

/**
 * Servicio de reporte de errores con Firebase Crashlytics.
 * - En Expo Go: registra en consola solamente
 * - En APK nativo: envía a Firebase Crashlytics con atributos contextuales
 * 
 * El servicio es tolerante a fallos y nunca rompe el flujo principal de la app.
 */
export class FirebaseCrashlyticsService implements ICrashReportingService {
  private rol: RolPerfil | null = null;
  private cola: Promise<void> = Promise.resolve();
  private initialized = false;
  private available = false;

  establecerRol(rol: RolPerfil | null): void {
    this.rol = rol;
  }

  private async verificarDisponibilidad(): Promise<boolean> {
    if (this.initialized) {
      return this.available;
    }

    // En Expo Go, Firebase no está disponible
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      this.initialized = true;
      this.available = false;
      return false;
    }

    // En APK nativo, intenta cargar Firebase
    try {
      await import('@react-native-firebase/app');
      this.available = true;
    } catch {
      console.debug('[Crashlytics] Firebase no disponible en este entorno');
      this.available = false;
    }

    this.initialized = true;
    return this.available;
  }

  registrarError(error: Error, contexto: ContextoErrorOperativo): Promise<void> {
    const atributos = {
      rol: contexto.rol ?? this.rol ?? 'sin_sesion',
      pantalla: contexto.pantalla,
      operacion: contexto.operacion,
      acta_id: contexto.actaId ?? 'no_aplica',
    };

    const registro = this.cola.then(async () => {
      try {
        const isAvailable = await this.verificarDisponibilidad();

        if (!isAvailable) {
          // Fallback: registrar en consola solamente
          console.error('[ERROR-OPERATIVO]', {
            mensaje: error.message,
            stack: error.stack,
            contexto: atributos,
          });
          return;
        }

        // Importar módulos de Crashlytics solo cuando sea necesario
        const { getCrashlytics, setAttributes, recordError } = await import(
          '@react-native-firebase/crashlytics'
        );

        const instancia = getCrashlytics();

        if (!instancia) {
          console.warn('[Crashlytics] No se pudo obtener instancia');
          return;
        }

        // Registrar atributos contextuales
        setAttributes(instancia, atributos);

        // Registrar el error
        recordError(instancia, error);
      } catch (innerError) {
        // No lanzar excepciones, solo logging
        console.error('[Crashlytics-Error]', innerError instanceof Error ? innerError.message : innerError);
        console.error('[ERROR-OPERATIVO-FALLBACK]', error.message, atributos);
      }
    });

    this.cola = registro.catch((falloPromesa: unknown) => {
      // Capturar cualquier error en la promesa para evitar que rompa la app
      console.error(
        '[Crashlytics-Promesa-Error]',
        falloPromesa instanceof Error ? falloPromesa.message : String(falloPromesa),
      );
    });

    return registro;
  }
}
