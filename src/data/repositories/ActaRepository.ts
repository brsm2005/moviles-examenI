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
  constructor(private readonly local: IActaLocalDataSource) {}

  async guardarCaptura(acta: CrearActaInput): Promise<void> {
    if (acta.estado && acta.estado !== 'PENDING_OCR') {
      throw new Error('Una captura nueva debe comenzar en estado PENDING_OCR.');
    }
    await this.local.guardar({ ...acta, estado: 'PENDING_OCR' });
  }

  obtenerPorId(actaId: string): Promise<Acta | null> {
    return this.local.obtenerPorId(actaId);
  }

  listarPorEstado(estados: EstadoActa[], usuarioId?: string): Promise<Acta[]> {
    return this.local.listarPorEstado(estados, usuarioId);
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
    votos: DatosVotos,
  ): Promise<void> {
    validarVotos(votos, false);
    const acta = exigirActa(await this.local.obtenerPorId(actaId), actaId);
    const siguiente = transicionarEstadoActa(acta, 'NEEDS_CONFIRMATION');
    await this.local.actualizar({
      ...siguiente,
      ...votos,
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
    const siguiente = transicionarEstadoActa(acta, 'PENDING_SYNC');
    await this.local.actualizar({
      ...siguiente,
      ...resultados,
      actualizadoPor,
      actualizadoEn: new Date().toISOString(),
    });
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
    await this.local.actualizar(transicionarEstadoActa(acta, 'SYNCED'));
  }

  obtenerParaMesa(
    mesaJrvId: string,
    dignidad: Dignidad,
  ): Promise<Acta | null> {
    return this.local.obtenerParaMesa(mesaJrvId, dignidad);
  }
}
