import type { Candidato } from '../entities/Candidato';
import type { MesaJrv } from '../entities/MesaJrv';
import type { OrganizacionPolitica } from '../entities/OrganizacionPolitica';
import type { PersonalTerritorial } from '../entities/PersonalTerritorial';
import type { Recinto } from '../entities/Recinto';
import type { NuevoRecinto } from './ITerritorioRepository';

export interface CatalogoTerritorial {
  usuarioId: string;
  recintos: Recinto[];
  mesas: MesaJrv[];
  organizaciones: OrganizacionPolitica[];
  candidatos: Candidato[];
}

export interface ITerritorioRemoteDataSource {
  obtenerUsuarioActualId(): Promise<string>;
  descargarCatalogo(): Promise<CatalogoTerritorial>;
  obtenerProvinciaActual(): Promise<string>;
  crearRecinto(datos: NuevoRecinto, provincia: string): Promise<Recinto>;
  listarCoordinadoresRecinto(): Promise<PersonalTerritorial[]>;
  asignarCoordinadorRecinto(
    recintoId: string,
    coordinadorId: string,
  ): Promise<Recinto>;
  listarVeedoresDisponibles(): Promise<PersonalTerritorial[]>;
  asignarVeedorMesas(
    recintoId: string,
    mesaIds: string[],
    veedorId: string,
  ): Promise<MesaJrv[]>;
  reemplazarVeedorMesas(
    recintoId: string,
    veedorSalienteId: string,
    veedorEntranteId: string,
  ): Promise<number>;
}

export interface ITerritorioLocalDataSource {
  guardarCatalogo(catalogo: CatalogoTerritorial): Promise<void>;
  guardarRecinto(recinto: Recinto, usuarioId: string): Promise<void>;
  guardarMesas(mesas: MesaJrv[], usuarioId: string): Promise<void>;
  listarRecintos(usuarioId: string): Promise<Recinto[]>;
  obtenerRecinto(usuarioId: string, recintoId: string): Promise<Recinto | null>;
  listarMesasJrv(usuarioId: string, recintoId: string): Promise<MesaJrv[]>;
  listarOrganizacionesPoliticas(): Promise<OrganizacionPolitica[]>;
  listarCandidatos(dignidad?: Candidato['dignidad']): Promise<Candidato[]>;
}
