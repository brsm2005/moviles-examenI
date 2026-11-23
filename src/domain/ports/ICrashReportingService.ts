import type { RolPerfil } from '@/domain/entities/Perfil';

export interface ContextoErrorOperativo {
  operacion: string;
  pantalla: string;
  actaId?: string;
  rol?: RolPerfil;
}

export interface ICrashReportingService {
  registrarError(
    error: Error,
    contexto: ContextoErrorOperativo,
  ): Promise<void>;
}
