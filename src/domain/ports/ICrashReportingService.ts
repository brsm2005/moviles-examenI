export interface ContextoErrorOperativo {
  operacion: string;
  pantalla: string;
  actaId?: string;
}

export interface ICrashReportingService {
  registrarError(
    error: Error,
    contexto: ContextoErrorOperativo,
  ): Promise<void>;
}
