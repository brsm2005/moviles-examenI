import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import type { Acta } from '@/domain/entities/Acta';
import type { IActaOcrService } from '@/domain/ports/IActaOcrService';
import type { IActaProcessingService } from '@/domain/ports/IActaProcessingService';
import type { IActaRepository } from '@/domain/ports/IActaRepository';
import type { ICrashReportingService } from '@/domain/ports/ICrashReportingService';
import type { IConnectivityService } from '@/domain/ports/IConnectivityService';
import type { ITerritorioRepository } from '@/domain/ports/ITerritorioRepository';

function comoError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error('Ocurrió un error inesperado durante el OCR del acta.');
}

export class SyncWorker implements IActaProcessingService {
  private removerListener: (() => void) | null = null;
  private removerListenerAppState: (() => void) | null = null;
  private usuarioActivoId: string | null = null;
  private alCompletarOcr: ((acta: Acta) => void) | null = null;
  private readonly procesosActivos = new Map<string, Promise<Acta>>();
  private readonly actasNotificadas = new Set<string>();
  private readonly sesionesRecuperadas = new Set<string>();
  private procesamientoCola: Promise<void> | null = null;

  constructor(
    private readonly actas: IActaRepository,
    private readonly ocr: IActaOcrService,
    private readonly territorio: ITerritorioRepository,
    private readonly conectividad: IConnectivityService,
    private readonly crashReporting: ICrashReportingService,
  ) {}

  iniciar(
    usuarioId: string,
    alCompletarOcr: (acta: Acta) => void,
  ): () => void {
    this.detener();
    this.usuarioActivoId = usuarioId;
    this.alCompletarOcr = alCompletarOcr;
    this.removerListener = NetInfo.addEventListener((estado) => {
      if (estado.isConnected && estado.isInternetReachable !== false) {
        void this.procesarPendientes(usuarioId).catch((error: unknown) =>
          this.reportarFalloWorker(error),
        );
      }
    });
    const appStateSubscription = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        void this.procesarPendientes(usuarioId).catch((error: unknown) =>
          this.reportarFalloWorker(error),
        );
      }
    });
    this.removerListenerAppState = () => appStateSubscription.remove();

    void this.notificarActasPendientes(usuarioId).catch((error: unknown) =>
      this.reportarFalloWorker(error),
    );
    void NetInfo.fetch()
      .then((estado) => {
        if (estado.isConnected && estado.isInternetReachable !== false) {
          return this.procesarPendientes(usuarioId);
        }
        return undefined;
      })
      .catch((error: unknown) => this.reportarFalloWorker(error));

    return () => this.detener();
  }

  detener(): void {
    this.removerListener?.();
    this.removerListenerAppState?.();
    this.removerListener = null;
    this.removerListenerAppState = null;
    this.usuarioActivoId = null;
    this.alCompletarOcr = null;
    this.actasNotificadas.clear();
    this.sesionesRecuperadas.clear();
  }

  async procesarActa(actaId: string, notificar = true): Promise<Acta> {
    const enProceso = this.procesosActivos.get(actaId);
    if (enProceso) return enProceso;

    const proceso = this.procesarActaInterno(actaId, notificar).finally(() => {
      this.procesosActivos.delete(actaId);
    });
    this.procesosActivos.set(actaId, proceso);
    return proceso;
  }

  private async procesarPendientes(usuarioId: string): Promise<void> {
    if (this.procesamientoCola) return this.procesamientoCola;

    this.procesamientoCola = this.drenarCola(usuarioId).finally(() => {
      this.procesamientoCola = null;
    });
    return this.procesamientoCola;
  }

  private async drenarCola(usuarioId: string): Promise<void> {
    await this.recuperarProcesosInterrumpidos(usuarioId);
    await this.notificarActasPendientes(usuarioId);

    const pendientes = await this.actas.listarPorEstado(
      ['PENDING_OCR'],
      usuarioId,
    );
    for (const acta of pendientes) {
      if (this.usuarioActivoId !== usuarioId) return;
      try {
        await this.procesarActa(acta.id);
      } catch (error) {
        await this.crashReporting.registrarError(comoError(error), {
          operacion: 'procesar_ocr_acta',
          pantalla: 'captura_acta',
          actaId: acta.id,
        });
      }
    }

    const pendientesDeSincronizar = await this.actas.listarPorEstado(
      ['PENDING_SYNC'],
      usuarioId,
    );
    for (const acta of pendientesDeSincronizar) {
      if (this.usuarioActivoId !== usuarioId) return;
      try {
        await this.actas.sincronizarPendiente(acta.id);
      } catch (error) {
        await this.crashReporting.registrarError(comoError(error), {
          operacion: 'sincronizar_acta_confirmada',
          pantalla: 'historial_actas',
          actaId: acta.id,
        });
      }
    }
  }

  private async recuperarProcesosInterrumpidos(
    usuarioId: string,
  ): Promise<void> {
    if (this.sesionesRecuperadas.has(usuarioId)) return;

    const interrumpidas = await this.actas.listarPorEstado(
      ['PROCESSING_OCR'],
      usuarioId,
    );
    for (const acta of interrumpidas) {
      if (this.usuarioActivoId !== usuarioId) return;
      if (!this.procesosActivos.has(acta.id)) {
        await this.actas.devolverOcrPendiente(acta.id);
      }
    }
    this.sesionesRecuperadas.add(usuarioId);
  }

  private async notificarActasPendientes(usuarioId: string): Promise<void> {
    const listasParaConfirmar = await this.actas.listarPorEstado(
      ['NEEDS_CONFIRMATION'],
      usuarioId,
    );
    for (const acta of listasParaConfirmar) {
      if (this.usuarioActivoId !== usuarioId) return;
      this.notificarListaParaConfirmar(acta);
    }
  }

  private async procesarActaInterno(
    actaId: string,
    notificar: boolean,
  ): Promise<Acta> {
    let acta = await this.actas.obtenerPorId(actaId);
    if (!acta) throw new Error(`No se encontró el acta ${actaId}.`);
    if (acta.estado !== 'PENDING_OCR') return acta;
    if (!(await this.conectividad.estaConectado())) return acta;

    await this.actas.marcarProcesandoOcr(actaId);

    try {
      const candidatos = await this.territorio.listarCandidatos(acta.dignidad);
      const votos = await this.ocr.extraerVotos(
        acta.fotoUri,
        acta.dignidad,
        candidatos,
      );
      await this.actas.actualizarExtraccionOcr(actaId, votos);
    } catch (error) {
      await this.actas.devolverOcrPendiente(actaId);
      throw error;
    }

    acta = await this.actas.obtenerPorId(actaId);
    if (!acta) throw new Error(`No se encontró el acta ${actaId}.`);
    if (notificar) this.notificarListaParaConfirmar(acta);
    return acta;
  }

  private notificarListaParaConfirmar(acta: Acta): void {
    if (
      acta.estado !== 'NEEDS_CONFIRMATION' ||
      this.usuarioActivoId !== acta.creadoPor ||
      this.actasNotificadas.has(acta.id)
    ) {
      return;
    }

    this.actasNotificadas.add(acta.id);
    this.alCompletarOcr?.(acta);
  }

  private async reportarFalloWorker(error: unknown): Promise<void> {
    await this.crashReporting.registrarError(comoError(error), {
      operacion: 'escuchar_conectividad_ocr',
      pantalla: 'captura_acta',
    });
  }
}
