import {
  transicionarEstadoActa,
  type Acta,
  type EstadoActa,
} from '@/domain/entities/Acta';
import type { Dignidad } from '@/domain/entities/Candidato';
import {
  actaVotosConfirmacionSchema,
  actaVotosExtraidosSchema,
} from '@/domain/schemas/actaVotosSchema';
import type { IActaLocalDataSource } from '@/domain/ports/IActaLocalDataSource';
import type { IActaRemoteDataSource } from '@/domain/ports/IActaRemoteDataSource';
import type { IConnectivityService } from '@/domain/ports/IConnectivityService';
import type { IActaOcrService } from '@/domain/ports/IActaOcrService';
import type { ITerritorioRepository } from '@/domain/ports/ITerritorioRepository';
import { exigirTerritorioVerificado, extraerOcrActa } from '@/domain/usecases/extraerOcrActa';
import type {
  CrearActaInput,
  IActaRepository,
} from '@/domain/ports/IActaRepository';

type DatosVotos = Pick<
  Acta,
  'totalSufragantes' | 'votosBlancos' | 'votosNulos' | 'votosCandidatos'
>;

function exigirActa(acta: Acta | null, actaId: string): Acta {
  if (!acta) throw new Error(`No se encontró el acta ${actaId}.`);
  return acta;
}

function validarVotos(datos: DatosVotos, paraConfirmar: boolean): void {
  const validacion = paraConfirmar
    ? actaVotosConfirmacionSchema.safeParse(datos)
    : actaVotosExtraidosSchema.safeParse(datos);
  if (!validacion.success) {
    throw new Error(validacion.error.issues[0]?.message ?? 'Los votos del acta no son válidos.');
  }
}

export class ActaRepository implements IActaRepository {
  constructor(
    private readonly local: IActaLocalDataSource,
    private readonly remote: IActaRemoteDataSource,
    private readonly connectivity: IConnectivityService,
    private readonly territorio: ITerritorioRepository,
    private readonly ocr: IActaOcrService,
  ) {}

  async guardarCaptura(acta: CrearActaInput): Promise<void> {
    if (acta.estado && acta.estado !== 'PENDING_OCR') {
      throw new Error('Una captura nueva debe comenzar en estado PENDING_OCR.');
    }
    await this.local.guardar({ ...acta, estado: 'PENDING_OCR', verificacionTerritorial: null });
  }

  obtenerPorId(actaId: string): Promise<Acta | null> {
    return this.obtenerActa(actaId);
  }

  async listarPorEstado(
    estados: EstadoActa[],
    usuarioId?: string,
  ): Promise<Acta[]> {
    const locales = await this.local.listarPorEstado(estados, usuarioId);
    if (!estados.includes('SYNCED') || !(await this.connectivity.estaConectado())) {
      return locales;
    }

    const remotas = await this.remote.listarSincronizadas();
    const actasPorId = new Map(locales.map((acta) => [acta.id, acta]));
    for (const acta of remotas) actasPorId.set(acta.id, acta);
    return [...actasPorId.values()].sort((a, b) =>
      b.actualizadoEn.localeCompare(a.actualizadoEn),
    );
  }

  async marcarProcesandoOcr(actaId: string): Promise<void> {
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    await this.local.actualizar(transicionarEstadoActa(acta, 'PROCESSING_OCR'));
  }

  async devolverOcrPendiente(actaId: string): Promise<void> {
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    await this.local.actualizar(transicionarEstadoActa(acta, 'PENDING_OCR'));
  }

  async actualizarExtraccionOcr(
    actaId: string,
    votos: DatosVotos & Pick<Acta, 'verificacionTerritorial'>,
  ): Promise<void> {
    validarVotos(votos, false);
    if (!votos.verificacionTerritorial) throw new Error('Falta el resultado de la verificación territorial.');
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    const siguiente = transicionarEstadoActa(acta, 'NEEDS_CONFIRMATION');
    await this.local.actualizar({
      ...siguiente,
      ...votos,
      actualizadoEn: new Date().toISOString(),
    });
  }

  async reiniciarOcr(actaId: string, fotoUri: string): Promise<void> {
    if (!fotoUri) throw new Error('Se requiere una fotografía del acta.');
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    const siguiente = transicionarEstadoActa(acta, 'PENDING_OCR');
    await this.local.actualizar({
      ...siguiente,
      fotoUri,
      verificacionTerritorial: null,
      actualizadoEn: new Date().toISOString(),
    });
  }

  async confirmarParaSincronizacion(
    actaId: string,
    resultados: DatosVotos,
    actualizadoPor: string,
  ): Promise<void> {
    validarVotos(resultados, true);
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    exigirTerritorioVerificado(acta.verificacionTerritorial);
    const siguiente = transicionarEstadoActa(acta, 'PENDING_SYNC');
    await this.local.actualizar({
      ...siguiente,
      ...resultados,
      actualizadoPor,
      actualizadoEn: new Date().toISOString(),
    });
  }

  async sincronizarPendiente(actaId: string): Promise<void> {
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    if (acta.estado !== 'PENDING_SYNC') {
      throw new Error('Solo se pueden sincronizar actas confirmadas pendientes.');
    }
    exigirTerritorioVerificado(acta.verificacionTerritorial);
    if (!(await this.connectivity.estaConectado())) return;

    const fotoStoragePath = await this.remote.guardarActa(acta);
    const sincronizada = transicionarEstadoActa(acta, 'SYNCED');
    await this.local.actualizar({
      ...sincronizada,
      fotoStoragePath,
      actualizadoEn: new Date().toISOString(),
    });
  }

  async corregirActaSincronizada(
    actaId: string,
    resultados: DatosVotos,
    fotoUri: string,
    actualizadoPor: string,
  ): Promise<void> {
    validarVotos(resultados, true);
    if (!(await this.connectivity.estaConectado())) {
      throw new Error('Se necesita conexión para corregir un acta ya enviada.');
    }

    const acta = await this.obtenerActa(actaId);
    if (!acta || acta.estado !== 'SYNCED') {
      throw new Error('El acta enviada ya no está disponible para corrección.');
    }

    const fotoVerificada = fotoUri.startsWith('http') ? acta.fotoUri : fotoUri;
    const lectura = await extraerOcrActa(acta, fotoVerificada, this.territorio, this.ocr);
    exigirTerritorioVerificado(lectura.verificacionTerritorial);

    const corregida: Acta = {
      ...acta,
      ...resultados,
      fotoUri: fotoVerificada,
      actualizadoPor,
      actualizadoEn: new Date().toISOString(),
    };
    const fotoStoragePath = await this.remote.guardarActa(corregida, {
      motivo: 'Corrección posterior al envío',
    });
    const localActa = await this.local.obtenerPorId(actaId);
    if (localActa) {
      await this.local.actualizar({
        ...corregida,
        fotoUri: fotoVerificada.startsWith('http') ? localActa.fotoUri : fotoVerificada,
        fotoStoragePath,
        estado: 'SYNCED',
      });
    }
  }

  async actualizarAlertaUbicacion(
    actaId: string,
    alertaUbicacion: boolean,
  ): Promise<void> {
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    await this.local.actualizar({ ...acta, alertaUbicacion });
  }

  async marcarSincronizada(actaId: string): Promise<void> {
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    exigirTerritorioVerificado(acta.verificacionTerritorial);
    await this.local.actualizar(transicionarEstadoActa(acta, 'SYNCED'));
  }

  obtenerParaMesa(
    mesaJrvId: string,
    dignidad: Dignidad,
  ): Promise<Acta | null> {
    return this.local.obtenerParaMesa(mesaJrvId, dignidad);
  }

  private async obtenerActa(actaId: string): Promise<Acta | null> {
    const local = await this.local.obtenerPorId(actaId);
    if (local && local.estado !== 'SYNCED') return local;
    if (!(await this.connectivity.estaConectado())) return local;

    const remota = await this.remote.obtenerPorId(actaId);
    if (remota) return remota;
    return local?.estado === 'SYNCED' ? null : local;
  }
}
