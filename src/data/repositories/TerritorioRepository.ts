import type { Candidato } from '@/domain/entities/Candidato';
import type { MesaJrv } from '@/domain/entities/MesaJrv';
import type { OrganizacionPolitica } from '@/domain/entities/OrganizacionPolitica';
import type { PersonalTerritorial } from '@/domain/entities/PersonalTerritorial';
import type { Recinto } from '@/domain/entities/Recinto';
import type { IConnectivityService } from '@/domain/ports/IConnectivityService';
import type {
  ITerritorioRepository,
  NuevoRecinto,
} from '@/domain/ports/ITerritorioRepository';
import type {
  ITerritorioLocalDataSource,
  ITerritorioRemoteDataSource,
} from '@/domain/ports/ITerritorioDataSources';

export class TerritorioRepository implements ITerritorioRepository {
  constructor(
    private readonly remote: ITerritorioRemoteDataSource,
    private readonly local: ITerritorioLocalDataSource,
    private readonly connectivity: IConnectivityService,
  ) {}

  async sincronizarCatalogoTerritorial(): Promise<boolean> {
    if (!(await this.connectivity.estaConectado())) return false;

    const catalogo = await this.remote.descargarCatalogo();
    await this.local.guardarCatalogo(catalogo);
    return true;
  }

  listarRecintos(): Promise<Recinto[]> {
    return this.remote
      .obtenerUsuarioActualId()
      .then((usuarioId) => this.local.listarRecintos(usuarioId));
  }

  async obtenerRecinto(recintoId: string): Promise<Recinto | null> {
    const usuarioId = await this.remote.obtenerUsuarioActualId();
    return this.local.obtenerRecinto(usuarioId, recintoId);
  }

  async listarMesasJrv(recintoId: string): Promise<MesaJrv[]> {
    const usuarioId = await this.remote.obtenerUsuarioActualId();
    return this.local.listarMesasJrv(usuarioId, recintoId);
  }

  listarOrganizacionesPoliticas(): Promise<OrganizacionPolitica[]> {
    return this.local.listarOrganizacionesPoliticas();
  }

  listarCandidatos(dignidad?: Candidato['dignidad']): Promise<Candidato[]> {
    return this.local.listarCandidatos(dignidad);
  }

  obtenerProvinciaActual(): Promise<string> {
    return this.remote.obtenerProvinciaActual();
  }

  async crearRecinto(datos: NuevoRecinto): Promise<Recinto> {
    const provincia = await this.obtenerProvinciaActual();
    const recinto = await this.remote.crearRecinto(datos, provincia);
    const usuarioId = await this.remote.obtenerUsuarioActualId();
    await this.local.guardarRecinto(recinto, usuarioId);
    return recinto;
  }

  listarCoordinadoresRecinto(): Promise<PersonalTerritorial[]> {
    return this.remote.listarCoordinadoresRecinto();
  }

  async asignarCoordinadorRecinto(
    recintoId: string,
    coordinadorId: string,
  ): Promise<void> {
    const recinto = await this.remote.asignarCoordinadorRecinto(
      recintoId,
      coordinadorId,
    );
    const usuarioId = await this.remote.obtenerUsuarioActualId();
    await this.local.guardarRecinto(recinto, usuarioId);
  }

  listarVeedoresDisponibles(): Promise<PersonalTerritorial[]> {
    return this.remote.listarVeedoresDisponibles();
  }

  async asignarVeedorMesas(
    recintoId: string,
    mesaIds: string[],
    veedorId: string,
  ): Promise<void> {
    const uniqueMesaIds = [...new Set(mesaIds)];
    if (uniqueMesaIds.length === 0) {
      throw new Error('Seleccione al menos una mesa para asignar.');
    }

    const mesas = await this.remote.asignarVeedorMesas(
      recintoId,
      uniqueMesaIds,
      veedorId,
    );
    const usuarioId = await this.remote.obtenerUsuarioActualId();
    await this.local.guardarMesas(mesas, usuarioId);
  }

  async reemplazarVeedorMesas(
    recintoId: string,
    veedorSalienteId: string,
    veedorEntranteId: string,
  ): Promise<number> {
    if (veedorSalienteId === veedorEntranteId) {
      throw new Error('El veedor entrante debe ser distinto al veedor saliente.');
    }

    const cantidad = await this.remote.reemplazarVeedorMesas(
      recintoId,
      veedorSalienteId,
      veedorEntranteId,
    );
    const usuarioId = await this.remote.obtenerUsuarioActualId();
    const mesas = await this.local.listarMesasJrv(usuarioId, recintoId);
    await this.local.guardarMesas(
      mesas.map((mesa) =>
        mesa.veedorIds.includes(veedorSalienteId)
          ? { ...mesa, veedorIds: [veedorEntranteId] }
          : mesa,
      ),
      usuarioId,
    );
    return cantidad;
  }
}
