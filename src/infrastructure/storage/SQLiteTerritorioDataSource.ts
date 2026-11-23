import type {
  CatalogoTerritorial,
  ITerritorioLocalDataSource,
} from '@/domain/ports/ITerritorioDataSources';
import type { Candidato } from '@/domain/entities/Candidato';
import type { MesaJrv } from '@/domain/entities/MesaJrv';
import type { OrganizacionPolitica } from '@/domain/entities/OrganizacionPolitica';
import type { Recinto } from '@/domain/entities/Recinto';
import { initializeDatabase } from './database';

interface RecintoRow {
  id: string;
  nombre: string;
  provincia: string;
  canton: string;
  parroquia: string | null;
  direccion: string | null;
  codigo_cne: string | null;
  coordinador_recinto_id: string | null;
  latitud: number | null;
  longitud: number | null;
}

interface MesaRow {
  id: string;
  recinto_id: string;
  numero: number;
  codigo: string;
  genero: MesaJrv['genero'];
  total_electores_padron: number;
  veedor_asignado_id: string | null;
}

interface OrganizacionRow {
  id: string;
  nombre: string;
  sigla: string;
  color: string | null;
  lista_numero: string | null;
}

interface CandidatoRow {
  id: string;
  organizacion_politica_id: string;
  nombres_completos: string;
  dignidad: Candidato['dignidad'];
  numero_lista: number | null;
}

function mapearRecintoLocal(row: RecintoRow): Recinto {
  const latitud = row.latitud;
  const longitud = row.longitud;
  return {
    id: row.id,
    nombre: row.nombre,
    provincia: row.provincia,
    canton: row.canton,
    parroquia: row.parroquia,
    direccion: row.direccion,
    codigoCne: row.codigo_cne,
    coordinadorRecintoId: row.coordinador_recinto_id,
    centroide: latitud !== null && longitud !== null
      ? { latitud, longitud }
      : null,
  };
}

function mapearMesaLocal(row: MesaRow): MesaJrv {
  return {
    id: row.id,
    recintoId: row.recinto_id,
    numero: row.numero,
    codigo: row.codigo,
    genero: row.genero,
    totalElectoresPadron: row.total_electores_padron,
    veedorIds: row.veedor_asignado_id ? [row.veedor_asignado_id] : [],
  };
}

function mapearOrganizacionLocal(row: OrganizacionRow): OrganizacionPolitica {
  return {
    id: row.id,
    nombre: row.nombre,
    sigla: row.sigla,
    color: row.color,
    numeroLista: row.lista_numero,
  };
}

function mapearCandidatoLocal(row: CandidatoRow): Candidato {
  return {
    id: row.id,
    organizacionPoliticaId: row.organizacion_politica_id,
    nombresCompletos: row.nombres_completos,
    dignidad: row.dignidad,
    numeroLista: row.numero_lista,
  };
}

export class SQLiteTerritorioDataSource implements ITerritorioLocalDataSource {
  async guardarCatalogo(catalogo: CatalogoTerritorial): Promise<void> {
    const database = await initializeDatabase();
    const updatedAt = new Date().toISOString();

    await database.withExclusiveTransactionAsync(async (transaction) => {
      for (const recinto of catalogo.recintos) {
        await transaction.runAsync(
          `INSERT INTO recintos (
            id, nombre, provincia, canton, parroquia, direccion, latitud, longitud,
            updated_at, codigo_cne, coordinador_recinto_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            nombre = excluded.nombre,
            provincia = excluded.provincia,
            canton = excluded.canton,
            parroquia = excluded.parroquia,
            direccion = excluded.direccion,
            latitud = excluded.latitud,
            longitud = excluded.longitud,
            updated_at = excluded.updated_at,
            codigo_cne = excluded.codigo_cne,
            coordinador_recinto_id = excluded.coordinador_recinto_id`,
          recinto.id,
          recinto.nombre,
          recinto.provincia,
          recinto.canton,
          recinto.parroquia,
          recinto.direccion,
          recinto.centroide?.latitud ?? null,
          recinto.centroide?.longitud ?? null,
          updatedAt,
          recinto.codigoCne,
          recinto.coordinadorRecintoId,
        );
        await transaction.runAsync(
          `INSERT OR IGNORE INTO territorio_recintos_usuario_cache (
            usuario_id, recinto_id
          ) VALUES (?, ?)`,
          catalogo.usuarioId,
          recinto.id,
        );
      }

      for (const organizacion of catalogo.organizaciones) {
        await transaction.runAsync(
          `INSERT INTO organizaciones_politicas (
            id, nombre, sigla, color, updated_at, lista_numero
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            nombre = excluded.nombre,
            sigla = excluded.sigla,
            color = excluded.color,
            updated_at = excluded.updated_at,
            lista_numero = excluded.lista_numero`,
          organizacion.id,
          organizacion.nombre,
          organizacion.sigla,
          organizacion.color,
          updatedAt,
          organizacion.numeroLista,
        );
      }

      for (const mesa of catalogo.mesas) {
        await transaction.runAsync(
          `INSERT INTO mesas_jrv (
            id, recinto_id, numero, codigo, updated_at, genero,
            total_electores_padron, veedor_asignado_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            recinto_id = excluded.recinto_id,
            numero = excluded.numero,
            codigo = excluded.codigo,
            updated_at = excluded.updated_at,
            genero = excluded.genero,
            total_electores_padron = excluded.total_electores_padron,
            veedor_asignado_id = excluded.veedor_asignado_id`,
          mesa.id,
          mesa.recintoId,
          mesa.numero,
          mesa.codigo,
          updatedAt,
          mesa.genero,
          mesa.totalElectoresPadron,
          mesa.veedorIds[0] ?? null,
        );
        await transaction.runAsync(
          `INSERT OR IGNORE INTO territorio_mesas_usuario_cache (
            usuario_id, mesa_id
          ) VALUES (?, ?)`,
          catalogo.usuarioId,
          mesa.id,
        );
      }

      for (const candidato of catalogo.candidatos) {
        await transaction.runAsync(
          `INSERT INTO candidatos (
            id, organizacion_politica_id, nombres_completos, dignidad,
            numero_lista, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            organizacion_politica_id = excluded.organizacion_politica_id,
            nombres_completos = excluded.nombres_completos,
            dignidad = excluded.dignidad,
            numero_lista = excluded.numero_lista,
            updated_at = excluded.updated_at`,
          candidato.id,
          candidato.organizacionPoliticaId,
          candidato.nombresCompletos,
          candidato.dignidad,
          candidato.numeroLista,
          updatedAt,
        );
      }
    });
  }

  async guardarRecinto(recinto: Recinto, usuarioId: string): Promise<void> {
    await this.guardarCatalogo({
      usuarioId,
      recintos: [recinto],
      mesas: [],
      organizaciones: [],
      candidatos: [],
    });
  }

  async guardarMesas(mesas: MesaJrv[], usuarioId: string): Promise<void> {
    const database = await initializeDatabase();
    const updatedAt = new Date().toISOString();

    await database.withExclusiveTransactionAsync(async (transaction) => {
      for (const mesa of mesas) {
        await transaction.runAsync(
          `INSERT INTO mesas_jrv (
            id, recinto_id, numero, codigo, updated_at, genero,
            total_electores_padron, veedor_asignado_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            recinto_id = excluded.recinto_id,
            numero = excluded.numero,
            codigo = excluded.codigo,
            updated_at = excluded.updated_at,
            genero = excluded.genero,
            total_electores_padron = excluded.total_electores_padron,
            veedor_asignado_id = excluded.veedor_asignado_id`,
          mesa.id,
          mesa.recintoId,
          mesa.numero,
          mesa.codigo,
          updatedAt,
          mesa.genero,
          mesa.totalElectoresPadron,
          mesa.veedorIds[0] ?? null,
        );
        await transaction.runAsync(
          `INSERT OR IGNORE INTO territorio_mesas_usuario_cache (
            usuario_id, mesa_id
          ) VALUES (?, ?)`,
          usuarioId,
          mesa.id,
        );
      }
    });
  }

  async listarRecintos(usuarioId: string): Promise<Recinto[]> {
    const database = await initializeDatabase();
    const rows = await database.getAllAsync<RecintoRow>(
      `SELECT r.* FROM recintos r
       JOIN territorio_recintos_usuario_cache scope
         ON scope.recinto_id = r.id
       WHERE scope.usuario_id = ?
       ORDER BY r.nombre`,
      usuarioId,
    );
    return rows.map(mapearRecintoLocal);
  }

  async obtenerRecinto(
    usuarioId: string,
    recintoId: string,
  ): Promise<Recinto | null> {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<RecintoRow>(
      `SELECT r.* FROM recintos r
       JOIN territorio_recintos_usuario_cache scope
         ON scope.recinto_id = r.id
       WHERE scope.usuario_id = ? AND r.id = ?`,
      usuarioId,
      recintoId,
    );
    return row ? mapearRecintoLocal(row) : null;
  }

  async listarMesasJrv(
    usuarioId: string,
    recintoId: string,
  ): Promise<MesaJrv[]> {
    const database = await initializeDatabase();
    const rows = await database.getAllAsync<MesaRow>(
      `SELECT m.* FROM mesas_jrv m
       JOIN territorio_mesas_usuario_cache mesa_scope
         ON mesa_scope.mesa_id = m.id
       JOIN territorio_recintos_usuario_cache recinto_scope
         ON recinto_scope.recinto_id = m.recinto_id
       WHERE mesa_scope.usuario_id = ?
         AND recinto_scope.usuario_id = ?
         AND m.recinto_id = ?
       ORDER BY m.numero`,
      usuarioId,
      usuarioId,
      recintoId,
    );
    return rows.map(mapearMesaLocal);
  }

  async listarOrganizacionesPoliticas(): Promise<OrganizacionPolitica[]> {
    const database = await initializeDatabase();
    const rows = await database.getAllAsync<OrganizacionRow>(
      'SELECT id, nombre, sigla, color, lista_numero FROM organizaciones_politicas ORDER BY nombre',
    );
    return rows.map(mapearOrganizacionLocal);
  }

  async listarCandidatos(
    dignidad?: Candidato['dignidad'],
  ): Promise<Candidato[]> {
    const database = await initializeDatabase();
    const rows = dignidad
      ? await database.getAllAsync<CandidatoRow>(
          `SELECT id, organizacion_politica_id, nombres_completos, dignidad,
                  numero_lista
           FROM candidatos WHERE dignidad = ? ORDER BY numero_lista`,
          dignidad,
        )
      : await database.getAllAsync<CandidatoRow>(
          `SELECT id, organizacion_politica_id, nombres_completos, dignidad,
                  numero_lista
           FROM candidatos ORDER BY dignidad, numero_lista`,
        );
    return rows.map(mapearCandidatoLocal);
  }
}
