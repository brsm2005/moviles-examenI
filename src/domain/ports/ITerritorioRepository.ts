import type { Candidato } from '../entities/Candidato';
import type { MesaJrv } from '../entities/MesaJrv';
import type { OrganizacionPolitica } from '../entities/OrganizacionPolitica';
import type { PersonalTerritorial } from '../entities/PersonalTerritorial';
import type { Recinto } from '../entities/Recinto';

export interface NuevoRecinto {
  nombre: string;
  canton: string;
  parroquia: string;
  direccion: string;
}

export interface ITerritorioRepository {
  sincronizarCatalogoTerritorial(): Promise<boolean>;
  listarRecintos(): Promise<Recinto[]>;
  obtenerRecinto(recintoId: string): Promise<Recinto | null>;
  listarMesasJrv(recintoId: string): Promise<MesaJrv[]>;
  listarMesasAsignadas(): Promise<MesaJrv[]>;
  listarOrganizacionesPoliticas(): Promise<OrganizacionPolitica[]>;
  listarCandidatos(dignidad?: Candidato['dignidad']): Promise<Candidato[]>;
  obtenerCandidatosPorIds(ids: string[]): Promise<Candidato[]>;
  obtenerProvinciaActual(): Promise<string>;
  crearRecinto(datos: NuevoRecinto): Promise<Recinto>;
  listarCoordinadoresRecinto(): Promise<PersonalTerritorial[]>;
  asignarCoordinadorRecinto(recintoId: string, coordinadorId: string): Promise<void>;
  listarVeedoresDisponibles(): Promise<PersonalTerritorial[]>;
  asignarVeedorMesas(
    recintoId: string,
    mesaIds: string[],
    veedorId: string,
  ): Promise<void>;
  reemplazarVeedorMesas(
    recintoId: string,
    veedorSalienteId: string,
    veedorEntranteId: string,
  ): Promise<number>;
}
