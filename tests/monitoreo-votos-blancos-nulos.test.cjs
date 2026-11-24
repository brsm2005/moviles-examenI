/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'infrastructure', 'supabase', 'SupabaseMonitoreoProvincial.ts'),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(rows, failure) {
  const queries = [];
  const supabase = {
    from(table) {
      const query = { table, filters: [], ranges: [] };
      queries.push(query);
      return {
        select(columns) {
          query.columns = columns;
          return this;
        },
        eq(column, value) {
          query.filters.push([column, value]);
          return this;
        },
        order(column) {
          query.order = column;
          return this;
        },
        range(start, end) {
          query.ranges.push([start, end]);
          const isSpecialVotes = query.columns.includes('votos_blancos');
          const result = isSpecialVotes
            ? { data: rows.slice(start, end + 1), error: failure ?? null }
            : { data: [], error: null };
          return {
            then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
            overrideTypes: () => Promise.resolve(result),
          };
        },
      };
    },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name === './client') return { supabase };
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return { service: new module.exports.SupabaseMonitoreoProvincial(), queries };
}

test('reads and paginates blank and null votes without changing the audit filter', async () => {
  const rows = Array.from({ length: 501 }, (_, index) => ({
    dignidad: index === 500 ? 'PREFECTO' : 'ALCALDE',
    votos_blancos: index,
    votos_nulos: 2,
    mesas_jrv: { recinto_id: index === 500 ? 'b' : 'a' },
  }));
  const { service, queries } = setup(rows);
  const datos = await service.consultar();
  assert.equal(datos.votosBlancosNulos.length, 501);
  assert.deepEqual(datos.votosBlancosNulos[500], {
    recintoId: 'b', dignidad: 'PREFECTO', blancos: 500, nulos: 2,
  });
  const specialQueries = queries.filter((query) => query.columns.includes('votos_blancos'));
  assert.deepEqual(specialQueries.map((query) => query.ranges[0]), [[0, 499], [500, 999]]);
  assert.ok(specialQueries.every((query) => query.order === 'id'));
  const auditQuery = queries.find((query) => query.table === 'actas' && !query.columns.includes('votos_blancos'));
  assert.deepEqual(auditQuery.filters, [['estado_sync', 'SYNCED']]);
});

test('a failed blank/null vote query fails the monitoring request', async () => {
  const error = new Error('No se pudieron consultar las actas');
  const { service } = setup([], error);
  await assert.rejects(service.consultar(), error);
});
