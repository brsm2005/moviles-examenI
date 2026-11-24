/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const test = require('node:test');
const ts = require('typescript');

function loadModule(relativePath, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

function createDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE recintos (id TEXT PRIMARY KEY, nombre TEXT, provincia TEXT, canton TEXT,
      parroquia TEXT, direccion TEXT, latitud REAL, longitud REAL, updated_at TEXT,
      codigo_cne TEXT, coordinador_recinto_id TEXT);
    CREATE TABLE mesas_jrv (id TEXT PRIMARY KEY, recinto_id TEXT REFERENCES recintos(id),
      numero INTEGER, codigo TEXT, updated_at TEXT, genero TEXT,
      total_electores_padron INTEGER, veedor_asignado_id TEXT);
    CREATE TABLE territorio_recintos_usuario_cache (usuario_id TEXT, recinto_id TEXT, PRIMARY KEY(usuario_id, recinto_id));
    CREATE TABLE territorio_mesas_usuario_cache (usuario_id TEXT, mesa_id TEXT, PRIMARY KEY(usuario_id, mesa_id));
    CREATE TABLE organizaciones_politicas (id TEXT PRIMARY KEY, nombre TEXT, sigla TEXT, color TEXT, updated_at TEXT, lista_numero TEXT);
    CREATE TABLE candidatos (id TEXT PRIMARY KEY, organizacion_politica_id TEXT REFERENCES organizaciones_politicas(id),
      nombres_completos TEXT, dignidad TEXT, numero_lista INTEGER, updated_at TEXT,
      UNIQUE (organizacion_politica_id, dignidad));
    CREATE TABLE candidatos_historicos (id TEXT PRIMARY KEY, organizacion_politica_id TEXT,
      nombres_completos TEXT, dignidad TEXT, numero_lista INTEGER, updated_at TEXT);
  `);
  const adapter = {
    runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
    execAsync: async (sql) => db.exec(sql),
    getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
    getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args) ?? null,
    withExclusiveTransactionAsync: async (callback) => {
      db.exec('BEGIN');
      try {
        await callback(adapter);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { db, adapter };
}

const recinto = (id) => ({
  id, nombre: id, provincia: 'provincia', canton: 'canton', parroquia: null,
  direccion: null, centroide: null, codigoCne: null, coordinadorRecintoId: null,
});

test('database migration archives existing candidates without removing them', async (t) => {
  const { db, adapter } = createDatabase();
  t.after(() => db.close());
  db.exec(`
    DROP TABLE candidatos_historicos;
    PRAGMA user_version = 5;
    INSERT INTO organizaciones_politicas (id, nombre, sigla) VALUES ('org', 'Organización', 'O');
    INSERT INTO candidatos VALUES ('old', 'org', 'Candidato', 'ALCALDE', 1, '2026');
  `);
  const { initializeDatabase } = loadModule(
    path.join('src', 'infrastructure', 'storage', 'database.ts'),
    { 'expo-sqlite': { openDatabaseAsync: async () => adapter } },
  );
  await initializeDatabase();
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 6);
  assert.equal(db.prepare('SELECT count(*) AS total FROM candidatos').get().total, 1);
  assert.equal(db.prepare('SELECT count(*) AS total FROM candidatos_historicos').get().total, 1);
});

test('a refreshed candidate catalog excludes stale entries while preserving old acta candidates', async (t) => {
  const { db, adapter } = createDatabase();
  t.after(() => db.close());
  const { SQLiteTerritorioDataSource } = loadModule(
    path.join('src', 'infrastructure', 'storage', 'SQLiteTerritorioDataSource.ts'),
    { './database': { initializeDatabase: async () => adapter } },
  );
  const local = new SQLiteTerritorioDataSource();
  const organizaciones = Array.from({ length: 6 }, (_, index) => ({
    id: `org${index}`, nombre: `Organización ${index}`, sigla: `O${index}`, color: null, numeroLista: `${index + 1}`,
  }));
  const candidato = (id, index) => ({
    id, organizacionPoliticaId: `org${index}`, nombresCompletos: id, dignidad: 'ALCALDE', numeroLista: index + 1,
  });
  const original = Array.from({ length: 6 }, (_, index) => candidato(`c${index}`, index));
  const catalogo = { usuarioId: 'veedor', recintos: [], mesas: [], organizaciones, candidatos: original };
  await local.guardarCatalogo(catalogo);
  const actualizado = [candidato('nuevo', 0), ...original.slice(1, 5)];
  await local.guardarCatalogo({ ...catalogo, candidatos: actualizado });

  assert.deepEqual((await local.listarCandidatos('ALCALDE')).map((item) => item.id),
    ['nuevo', 'c1', 'c2', 'c3', 'c4']);
  assert.deepEqual((await local.obtenerCandidatosPorIds(['c5', 'c0', 'c1'])).map((item) => item.id),
    ['c5', 'c0', 'c1']);
  await assert.rejects(local.obtenerCandidatosPorIds(['inexistente']), /No se encontró un candidato/);

  await assert.rejects(local.guardarCatalogo({
    ...catalogo,
    candidatos: [{ ...candidato('invalido', 0), organizacionPoliticaId: 'no-existe' }],
  }));
  assert.deepEqual((await local.listarCandidatos('ALCALDE')).map((item) => item.id),
    ['nuevo', 'c1', 'c2', 'c3', 'c4']);
});
const mesa = (id, recintoId, veedorId) => ({
  id, recintoId, numero: 1, codigo: id, genero: 'MIXTA',
  totalElectoresPadron: 100, veedorIds: veedorId ? [veedorId] : [],
});

test('capture assignments synchronize online and remain available offline, scoped to the veedor', async (t) => {
  const { db, adapter } = createDatabase();
  t.after(() => db.close());
  const { SQLiteTerritorioDataSource } = loadModule(
    path.join('src', 'infrastructure', 'storage', 'SQLiteTerritorioDataSource.ts'),
    { './database': { initializeDatabase: async () => adapter } },
  );
  const { TerritorioRepository } = loadModule(
    path.join('src', 'data', 'repositories', 'TerritorioRepository.ts'),
  );
  const local = new SQLiteTerritorioDataSource();
  let online = true;
  let catalogo = {
    usuarioId: 'veedor-a',
    recintos: [recinto('r1'), recinto('r2')],
    mesas: [mesa('m1', 'r1', 'veedor-a'), mesa('m2', 'r1', 'veedor-b'), mesa('m3', 'r2', 'veedor-a')],
    organizaciones: [], candidatos: [],
  };
  const remote = {
    obtenerUsuarioActualId: async () => 'veedor-a',
    descargarCatalogo: async () => catalogo,
  };
  const repository = new TerritorioRepository(remote, local, { estaConectado: async () => online });

  assert.equal(await repository.sincronizarCatalogoTerritorial(), true);
  assert.deepEqual((await repository.listarMesasAsignadas()).map((item) => item.id), ['m1', 'm3']);
  await local.guardarRecinto(recinto('r3'), 'veedor-a');
  assert.deepEqual((await repository.listarMesasAsignadas()).map((item) => item.id), ['m1', 'm3']);
  online = false;
  assert.equal(await repository.sincronizarCatalogoTerritorial(), false);
  assert.deepEqual((await repository.listarMesasAsignadas()).map((item) => item.id), ['m1', 'm3']);
  assert.deepEqual(await local.listarMesasAsignadas('veedor-b'), []);

  online = true;
  catalogo = { ...catalogo, mesas: [mesa('m3', 'r2', 'veedor-a')] };
  await repository.sincronizarCatalogoTerritorial();
  assert.deepEqual((await repository.listarMesasAsignadas()).map((item) => item.id), ['m3']);
});
