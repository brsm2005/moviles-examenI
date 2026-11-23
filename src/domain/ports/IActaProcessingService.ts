import type { Acta } from '../entities/Acta';

export interface IActaProcessingService {
  iniciar(
    usuarioId: string,
    alCompletarOcr: (acta: Acta) => void,
  ): () => void;
  procesarActa(actaId: string, notificar?: boolean): Promise<Acta>;
}
