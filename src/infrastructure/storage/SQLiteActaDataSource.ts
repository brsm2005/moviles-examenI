import type { Acta, EstadoActa } from '@/domain/entities/Acta';
import type { Dignidad } from '@/domain/entities/Candidato';
import type { VotoCandidato } from '@/domain/entities/VotoCandidato';
import type { IActaLocalDataSource } from '@/domain/ports/IActaLocalDataSource';
import { initializeDatabase } from './database';

interface ActaRow {
  id: string;
  mesa_jrv_id: string;
  dignidad: Dignidad;
  estado: EstadoActa;
  foto_uri: string;
  foto_storage_path: string | null;
  latitud: number | null;
  longitud: number | null;
  precision_metros: number | null;
  ubicacion_capturada_en: string | null;
  alerta_ubicacion: number;
  verificacion_territorial: Acta['verificacionTerritorial'];
  total_sufragantes: number | null;
  votos_blancos: number | null;
  votos_nulos: number | null;
  votos_candidatos_json: string;
  creado_por: string;
  actualizado_por: string;
  creado_en: string;
  actualizado_en: string;
}

function mapearActa(row: ActaRow): Acta {
  const ubicacion =
    row.latitud !== null &&
    row.longitud !== null &&
    row.ubicacion_capturada_en !== null
      ? {
          latitud: row.latitud,
          longitud: row.longitud,
          precisionMetros: row.precision_metros,
          capturadaEn: row.ubicacion_capturada_en,
        }
      : null;

  return {
    id: row.id,
    mesaJrvId: row.mesa_jrv_id,
    dignidad: row.dignidad,
    estado: row.estado,
    fotoUri: row.foto_uri,
    fotoStoragePath: row.foto_storage_path,
    ubicacion,
    alertaUbicacion: row.alerta_ubicacion === 1,
    verificacionTerritorial: row.verificacion_territorial,
    totalSufragantes: row.total_sufragantes,
    votosBlancos: row.votos_blancos,
    votosNulos: row.votos_nulos,
    votosCandidatos: JSON.parse(row.votos_candidatos_json) as VotoCandidato[],
    creadoPor: row.creado_por,
    actualizadoPor: row.actualizado_por,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  };
}

export class SQLiteActaDataSource implements IActaLocalDataSource {
  async guardar(acta: Acta): Promise<void> {
    const database = await initializeDatabase();
    await database.runAsync(
      `INSERT INTO actas (
        id, mesa_jrv_id, dignidad, estado, foto_uri, latitud, longitud,
        foto_storage_path, precision_metros, ubicacion_capturada_en, alerta_ubicacion,
        total_sufragantes, votos_blancos, votos_nulos, votos_candidatos_json,
        creado_por, actualizado_por, creado_en, actualizado_en, verificacion_territorial
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      acta.id,
      acta.mesaJrvId,
      acta.dignidad,
      acta.estado,
      acta.fotoUri,
      acta.ubicacion?.latitud ?? null,
      acta.ubicacion?.longitud ?? null,
      acta.fotoStoragePath,
      acta.ubicacion?.precisionMetros ?? null,
      acta.ubicacion?.capturadaEn ?? null,
      acta.alertaUbicacion ? 1 : 0,
      acta.totalSufragantes,
      acta.votosBlancos,
      acta.votosNulos,
      JSON.stringify(acta.votosCandidatos),
      acta.creadoPor,
      acta.actualizadoPor,
      acta.creadoEn,
      acta.actualizadoEn,
      acta.verificacionTerritorial,
    );
  }

  async obtenerPorId(actaId: string): Promise<Acta | null> {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<ActaRow>(
      'SELECT * FROM actas WHERE id = ?',
      actaId,
    );
    return row ? mapearActa(row) : null;
  }

  async listarPorEstado(
    estados: EstadoActa[],
    usuarioId?: string,
  ): Promise<Acta[]> {
    if (estados.length === 0) return [];

    const database = await initializeDatabase();
    const placeholders = estados.map(() => '?').join(', ');
    const query = usuarioId
      ? `SELECT * FROM actas WHERE estado IN (${placeholders})
         AND creado_por = ? ORDER BY creado_en`
      : `SELECT * FROM actas WHERE estado IN (${placeholders})
         ORDER BY creado_en`;
    const rows = await database.getAllAsync<ActaRow>(
      query,
      ...estados,
      ...(usuarioId ? [usuarioId] : []),
    );
    return rows.map(mapearActa);
  }

  async actualizar(acta: Acta): Promise<void> {
    const database = await initializeDatabase();
    const result = await database.runAsync(
      `UPDATE actas SET
        mesa_jrv_id = ?, dignidad = ?, estado = ?, foto_uri = ?, latitud = ?,
        longitud = ?, foto_storage_path = ?, precision_metros = ?, ubicacion_capturada_en = ?,
        alerta_ubicacion = ?, total_sufragantes = ?, votos_blancos = ?,
        votos_nulos = ?, votos_candidatos_json = ?, actualizado_por = ?,
        actualizado_en = ?, verificacion_territorial = ?
      WHERE id = ?`,
      acta.mesaJrvId,
      acta.dignidad,
      acta.estado,
      acta.fotoUri,
      acta.ubicacion?.latitud ?? null,
      acta.ubicacion?.longitud ?? null,
      acta.fotoStoragePath,
      acta.ubicacion?.precisionMetros ?? null,
      acta.ubicacion?.capturadaEn ?? null,
      acta.alertaUbicacion ? 1 : 0,
      acta.totalSufragantes,
      acta.votosBlancos,
      acta.votosNulos,
      JSON.stringify(acta.votosCandidatos),
      acta.actualizadoPor,
      acta.actualizadoEn,
      acta.verificacionTerritorial,
      acta.id,
    );
    if (result.changes === 0) {
      throw new Error(`No se encontró el acta ${acta.id} para actualizar.`);
    }
  }

  async obtenerParaMesa(
    mesaJrvId: string,
    dignidad: Dignidad,
  ): Promise<Acta | null> {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<ActaRow>(
      'SELECT * FROM actas WHERE mesa_jrv_id = ? AND dignidad = ?',
      mesaJrvId,
      dignidad,
    );
    return row ? mapearActa(row) : null;
  }
}
