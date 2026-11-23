import type { Candidato } from '../entities/Candidato';
import type { MesaJrv } from '../entities/MesaJrv';
import type { OrganizacionPolitica } from '../entities/OrganizacionPolitica';
import type { Recinto } from '../entities/Recinto';

export interface ITerritorioRepository {
  listarRecintos(): Promise<Recinto[]>;
  obtenerRecinto(recintoId: string): Promise<Recinto | null>;
  listarMesasJrv(recintoId: string): Promise<MesaJrv[]>;
  listarOrganizacionesPoliticas(): Promise<OrganizacionPolitica[]>;
  listarCandidatos(dignidad?: Candidato['dignidad']): Promise<Candidato[]>;
}
