/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'infrastructure', 'sync', 'SyncWorker.ts'),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const dependencies = {
  '@react-native-community/netinfo': { __esModule: true, default: {} },
  'react-native': { AppState: {} },
};
const moduleUnderTest = { exports: {} };
new Function('require', 'module', 'exports', javascript)((name) => {
  if (name in dependencies) return dependencies[name];
  throw new Error(`Unexpected dependency: ${name}`);
}, moduleUnderTest, moduleUnderTest.exports);

test('deferred OCR uses candidates captured on the acta, in their original order', async () => {
  const { SyncWorker } = moduleUnderTest.exports;
  const acta = {
    id: 'acta', estado: 'PENDING_OCR', fotoUri: 'photo', dignidad: 'ALCALDE',
    votosCandidatos: ['old', 'second', 'third', 'fourth', 'fifth'].map((candidatoId) => ({ candidatoId })),
  };
  let processed;
  const actas = {
    obtenerPorId: async () => acta,
    marcarProcesandoOcr: async () => { acta.estado = 'PROCESSING_OCR'; },
    actualizarExtraccionOcr: async (_, votes) => { processed = votes; acta.estado = 'NEEDS_CONFIRMATION'; },
  };
  const territorio = {
    obtenerCandidatosPorIds: async (ids) => {
      assert.deepEqual(ids, ['old', 'second', 'third', 'fourth', 'fifth']);
      return ids.map((id) => ({ id }));
    },
  };
  const ocr = {
    extraerVotos: async (_, __, candidates) => candidates.map((candidate) => candidate.id),
  };
  const worker = new SyncWorker(actas, ocr, territorio, { estaConectado: async () => true }, {});
  assert.equal((await worker.procesarActa('acta', false)).estado, 'NEEDS_CONFIRMATION');
  assert.deepEqual(processed, ['old', 'second', 'third', 'fourth', 'fifth']);
});

test('missing historical candidates return the acta to pending OCR', async () => {
  const { SyncWorker } = moduleUnderTest.exports;
  const acta = { id: 'acta', estado: 'PENDING_OCR', votosCandidatos: [{ candidatoId: 'missing' }] };
  const actas = {
    obtenerPorId: async () => acta,
    marcarProcesandoOcr: async () => { acta.estado = 'PROCESSING_OCR'; },
    devolverOcrPendiente: async () => { acta.estado = 'PENDING_OCR'; },
  };
  const worker = new SyncWorker(
    actas,
    { extraerVotos: async () => assert.fail('OCR must not run with missing candidates') },
    { obtenerCandidatosPorIds: async () => { throw new Error('Candidato no encontrado'); } },
    { estaConectado: async () => true },
    {},
  );
  await assert.rejects(worker.procesarActa('acta', false), /Candidato no encontrado/);
  assert.equal(acta.estado, 'PENDING_OCR');
});

test('manual and automatic attempts share the same OCR operation', async () => {
  const { SyncWorker } = moduleUnderTest.exports;
  const acta = { id: 'acta', creadoPor: 'veedor', estado: 'PENDING_OCR', votosCandidatos: [] };
  let releaseOcr;
  let ocrCalls = 0;
  const actas = {
    obtenerPorId: async () => acta,
    marcarProcesandoOcr: async () => { acta.estado = 'PROCESSING_OCR'; },
    actualizarExtraccionOcr: async () => { acta.estado = 'NEEDS_CONFIRMATION'; },
  };
  const worker = new SyncWorker(
    actas,
    { extraerVotos: () => { ocrCalls += 1; return new Promise((resolve) => { releaseOcr = resolve; }); } },
    { obtenerCandidatosPorIds: async () => [] },
    { estaConectado: async () => true },
    {},
  );
  const automatic = worker.procesarActa('acta');
  const manual = worker.procesarActa('acta');
  await new Promise(setImmediate);
  assert.equal(ocrCalls, 1);
  releaseOcr({});
  const results = await Promise.all([automatic, manual]);
  assert.deepEqual(results.map((result) => result.estado), ['NEEDS_CONFIRMATION', 'NEEDS_CONFIRMATION']);
});

test('offline retry does not start OCR or change the pending acta', async () => {
  const { SyncWorker } = moduleUnderTest.exports;
  const acta = { id: 'acta', estado: 'PENDING_OCR' };
  const worker = new SyncWorker(
    { obtenerPorId: async () => acta },
    { extraerVotos: async () => assert.fail('OCR must not run offline') },
    {},
    { estaConectado: async () => false },
    {},
  );
  assert.equal((await worker.procesarActa('acta')).estado, 'PENDING_OCR');
});
