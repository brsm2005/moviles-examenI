import {
  getCrashlytics,
  recordError,
  setAttributes,
} from '@react-native-firebase/crashlytics';
import type {
  ContextoErrorOperativo,
  ICrashReportingService,
} from '@/domain/ports/ICrashReportingService';

export class FirebaseCrashReportingService
  implements ICrashReportingService
{
  async registrarError(
    error: Error,
    contexto: ContextoErrorOperativo,
  ): Promise<void> {
    const atributos: Record<string, string> = {
      operacion: contexto.operacion,
      pantalla: contexto.pantalla,
    };
    if (contexto.actaId) atributos.acta_id = contexto.actaId;

    const crashlytics = getCrashlytics();
    await setAttributes(crashlytics, atributos);
    recordError(crashlytics, error);
  }
}
