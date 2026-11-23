import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';

const DATABASE_NAME = 'exameni.db';
const DATABASE_VERSION = 4;

const INITIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS recintos (
    id TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    provincia TEXT NOT NULL,
    canton TEXT NOT NULL,
    parroquia TEXT,
    direccion TEXT,
    latitud REAL,
    longitud REAL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mesas_jrv (
    id TEXT PRIMARY KEY NOT NULL,
    recinto_id TEXT NOT NULL REFERENCES recintos(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL CHECK (numero > 0),
    codigo TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (recinto_id, numero)
  );

  CREATE TABLE IF NOT EXISTS organizaciones_politicas (
    id TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    sigla TEXT NOT NULL,
    color TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS candidatos (
    id TEXT PRIMARY KEY NOT NULL,
    organizacion_politica_id TEXT NOT NULL
      REFERENCES organizaciones_politicas(id) ON DELETE CASCADE,
    nombres_completos TEXT NOT NULL,
    dignidad TEXT NOT NULL CHECK (dignidad IN ('ALCALDE', 'PREFECTO')),
    numero_lista INTEGER CHECK (numero_lista IS NULL OR numero_lista > 0),
    updated_at TEXT NOT NULL,
    UNIQUE (organizacion_politica_id, dignidad)
  );

  CREATE TABLE IF NOT EXISTS actas (
    id TEXT PRIMARY KEY NOT NULL,
    mesa_jrv_id TEXT NOT NULL REFERENCES mesas_jrv(id),
    dignidad TEXT NOT NULL CHECK (dignidad IN ('ALCALDE', 'PREFECTO')),
    estado TEXT NOT NULL CHECK (
      estado IN (
        'PENDING_OCR',
        'PROCESSING_OCR',
        'NEEDS_CONFIRMATION',
        'PENDING_SYNC',
        'SYNCED'
      )
    ),
    foto_uri TEXT NOT NULL,
    latitud REAL,
    longitud REAL,
    precision_metros REAL,
    ubicacion_capturada_en TEXT,
    alerta_ubicacion INTEGER NOT NULL DEFAULT 0
      CHECK (alerta_ubicacion IN (0, 1)),
    total_sufragantes INTEGER CHECK (
      total_sufragantes IS NULL OR total_sufragantes >= 0
    ),
    votos_blancos INTEGER CHECK (votos_blancos IS NULL OR votos_blancos >= 0),
    votos_nulos INTEGER CHECK (votos_nulos IS NULL OR votos_nulos >= 0),
    votos_candidatos_json TEXT NOT NULL DEFAULT '[]',
    creado_por TEXT NOT NULL,
    actualizado_por TEXT NOT NULL,
    creado_en TEXT NOT NULL,
    actualizado_en TEXT NOT NULL,
    UNIQUE (mesa_jrv_id, dignidad)
  );

  CREATE INDEX IF NOT EXISTS idx_mesas_jrv_recinto
    ON mesas_jrv (recinto_id);
  CREATE INDEX IF NOT EXISTS idx_candidatos_dignidad
    ON candidatos (dignidad);
  CREATE INDEX IF NOT EXISTS idx_actas_estado_actualizacion
    ON actas (estado, actualizado_en);
  CREATE INDEX IF NOT EXISTS idx_actas_mesa
    ON actas (mesa_jrv_id);
`;

let databasePromise: Promise<SQLiteDatabase> | undefined;

async function initializeAndMigrateDatabase(): Promise<SQLiteDatabase> {
  const database = await openDatabaseAsync(DATABASE_NAME);

  try {
    await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

    const versionRow = await database.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version',
    );
    const currentVersion = versionRow?.user_version ?? 0;

    if (currentVersion > DATABASE_VERSION) {
      throw new Error(
        `La base local tiene una versión (${currentVersion}) más reciente que la soportada (${DATABASE_VERSION}).`,
      );
    }

    if (currentVersion < 1) {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.execAsync(INITIAL_SCHEMA);
      });
      await database.execAsync('PRAGMA user_version = 1;');
    }

    if (currentVersion < 2) {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.execAsync(`
          ALTER TABLE recintos ADD COLUMN codigo_cne TEXT;
          ALTER TABLE recintos ADD COLUMN coordinador_recinto_id TEXT;
          ALTER TABLE mesas_jrv ADD COLUMN genero TEXT NOT NULL DEFAULT 'MIXTA';
          ALTER TABLE mesas_jrv
            ADD COLUMN total_electores_padron INTEGER NOT NULL DEFAULT 350;
          ALTER TABLE mesas_jrv ADD COLUMN veedor_asignado_id TEXT;
          ALTER TABLE organizaciones_politicas ADD COLUMN lista_numero TEXT;
          CREATE INDEX IF NOT EXISTS idx_mesas_jrv_veedor
            ON mesas_jrv (veedor_asignado_id);
        `);
      });
      await database.execAsync('PRAGMA user_version = 2;');
    }

    if (currentVersion < 3) {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.execAsync(`
          CREATE TABLE IF NOT EXISTS territorio_recintos_usuario_cache (
            usuario_id TEXT NOT NULL,
            recinto_id TEXT NOT NULL REFERENCES recintos(id) ON DELETE CASCADE,
            PRIMARY KEY (usuario_id, recinto_id)
          );
          CREATE TABLE IF NOT EXISTS territorio_mesas_usuario_cache (
            usuario_id TEXT NOT NULL,
            mesa_id TEXT NOT NULL REFERENCES mesas_jrv(id) ON DELETE CASCADE,
            PRIMARY KEY (usuario_id, mesa_id)
          );
          CREATE INDEX IF NOT EXISTS idx_territorio_recintos_usuario
            ON territorio_recintos_usuario_cache (usuario_id);
          CREATE INDEX IF NOT EXISTS idx_territorio_mesas_usuario
            ON territorio_mesas_usuario_cache (usuario_id);
        `);
      });
      await database.execAsync('PRAGMA user_version = 3;');
    }

    if (currentVersion < 4) {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.execAsync(`
          CREATE TEMP TABLE territorio_mesas_usuario_cache_backup AS
            SELECT usuario_id, mesa_id FROM territorio_mesas_usuario_cache;
          DROP TABLE territorio_mesas_usuario_cache;

          CREATE TABLE mesas_jrv_replacement (
            id TEXT PRIMARY KEY NOT NULL,
            recinto_id TEXT NOT NULL REFERENCES recintos(id) ON DELETE CASCADE,
            numero INTEGER NOT NULL CHECK (numero > 0),
            codigo TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            genero TEXT NOT NULL DEFAULT 'MIXTA',
            total_electores_padron INTEGER NOT NULL DEFAULT 350,
            veedor_asignado_id TEXT,
            UNIQUE (recinto_id, numero, genero)
          );
          INSERT INTO mesas_jrv_replacement (
            id, recinto_id, numero, codigo, updated_at, genero,
            total_electores_padron, veedor_asignado_id
          )
          SELECT
            id, recinto_id, numero, codigo, updated_at, genero,
            total_electores_padron, veedor_asignado_id
          FROM mesas_jrv;

          CREATE TABLE actas_replacement (
            id TEXT PRIMARY KEY NOT NULL,
            mesa_jrv_id TEXT NOT NULL REFERENCES mesas_jrv_replacement(id),
            dignidad TEXT NOT NULL CHECK (dignidad IN ('ALCALDE', 'PREFECTO')),
            estado TEXT NOT NULL CHECK (
              estado IN (
                'PENDING_OCR',
                'PROCESSING_OCR',
                'NEEDS_CONFIRMATION',
                'PENDING_SYNC',
                'SYNCED'
              )
            ),
            foto_uri TEXT NOT NULL,
            latitud REAL,
            longitud REAL,
            precision_metros REAL,
            ubicacion_capturada_en TEXT,
            alerta_ubicacion INTEGER NOT NULL DEFAULT 0
              CHECK (alerta_ubicacion IN (0, 1)),
            total_sufragantes INTEGER CHECK (
              total_sufragantes IS NULL OR total_sufragantes >= 0
            ),
            votos_blancos INTEGER CHECK (
              votos_blancos IS NULL OR votos_blancos >= 0
            ),
            votos_nulos INTEGER CHECK (
              votos_nulos IS NULL OR votos_nulos >= 0
            ),
            votos_candidatos_json TEXT NOT NULL DEFAULT '[]',
            creado_por TEXT NOT NULL,
            actualizado_por TEXT NOT NULL,
            creado_en TEXT NOT NULL,
            actualizado_en TEXT NOT NULL,
            UNIQUE (mesa_jrv_id, dignidad)
          );
          INSERT INTO actas_replacement (
            id, mesa_jrv_id, dignidad, estado, foto_uri, latitud, longitud,
            precision_metros, ubicacion_capturada_en, alerta_ubicacion,
            total_sufragantes, votos_blancos, votos_nulos,
            votos_candidatos_json, creado_por, actualizado_por, creado_en,
            actualizado_en
          )
          SELECT
            id, mesa_jrv_id, dignidad, estado, foto_uri, latitud, longitud,
            precision_metros, ubicacion_capturada_en, alerta_ubicacion,
            total_sufragantes, votos_blancos, votos_nulos,
            votos_candidatos_json, creado_por, actualizado_por, creado_en,
            actualizado_en
          FROM actas;

          DROP TABLE actas;
          DROP TABLE mesas_jrv;
          ALTER TABLE mesas_jrv_replacement RENAME TO mesas_jrv;
          ALTER TABLE actas_replacement RENAME TO actas;

          CREATE TABLE territorio_mesas_usuario_cache (
            usuario_id TEXT NOT NULL,
            mesa_id TEXT NOT NULL REFERENCES mesas_jrv(id) ON DELETE CASCADE,
            PRIMARY KEY (usuario_id, mesa_id)
          );
          INSERT INTO territorio_mesas_usuario_cache (usuario_id, mesa_id)
            SELECT usuario_id, mesa_id
            FROM territorio_mesas_usuario_cache_backup;
          DROP TABLE territorio_mesas_usuario_cache_backup;

          CREATE INDEX IF NOT EXISTS idx_mesas_jrv_recinto
            ON mesas_jrv (recinto_id);
          CREATE INDEX IF NOT EXISTS idx_mesas_jrv_veedor
            ON mesas_jrv (veedor_asignado_id);
          CREATE INDEX IF NOT EXISTS idx_actas_estado_actualizacion
            ON actas (estado, actualizado_en);
          CREATE INDEX IF NOT EXISTS idx_actas_mesa
            ON actas (mesa_jrv_id);
          CREATE INDEX IF NOT EXISTS idx_territorio_mesas_usuario
            ON territorio_mesas_usuario_cache (usuario_id);
        `);
      });
      await database.execAsync('PRAGMA user_version = 4;');
    }

    return database;
  } catch (error) {
    await database.closeAsync();
    throw error;
  }
}

export function initializeDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initializeAndMigrateDatabase().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}
