/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function load(relativePath, dependencies = {}) {
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

const usecase = load(path.join('src', 'domain', 'usecases', 'extraerOcrActa.ts'));
const entities = load(path.join('src', 'domain', 'entities', 'Acta.ts'));
const schemas = load(path.join('src', 'domain', 'schemas', 'actaVotosSchema.ts'), { zod: require('zod') });
const { ActaRepository } = load(path.join('src', 'data', 'repositories', 'ActaRepository.ts'), {
  '@/domain/entities/Acta': entities,
  '@/domain/schemas/actaVotosSchema': schemas,
  '@/domain/usecases/extraerOcrActa': usecase,
});

const votos = {
  totalSufragantes: 5, votosBlancos: 0, votosNulos: 0,
  votosCandidatos: ['a', 'b', 'c', 'd', 'e'].map((candidatoId) => ({ candidatoId, votos: 1 })),
};
const acta = (estado, verificacionTerritorial = null) => ({
  id: 'acta', mesaJrvId: 'mesa', dignidad: 'ALCALDE', estado, fotoUri: 'file://foto',
  verificacionTerritorial, ...votos,
});
const territorio = {
  obtenerRecintoPorMesa: async () => ({ provincia: 'Guayas', canton: 'Durán' }),
  obtenerCandidatosPorIds: async (ids) => ids.map((id) => ({ id })),
};
const ocr = (provinciaLeida, cantonLeido) => ({
  extraerVotos: async () => ({ ...votos, provinciaLeida, cantonLeido }),
});

test('compares province and canton without accents or casing and blocks unreadable or different fields', async () => {
  const current = acta('PENDING_OCR');
  for (const [provincia, canton, esperado] of [
    ['GUAYAS', 'Duran', 'COINCIDE'],
    ['Guayas', 'Quito', 'NO_COINCIDE'],
    ['Pichincha', 'Durán', 'NO_COINCIDE'],
    ['Pichincha', null, 'NO_COINCIDE'],
    [null, 'Quito', 'NO_COINCIDE'],
    ['Guayas', null, 'NO_VERIFICABLE'],
    [null, 'Durán', 'NO_VERIFICABLE'],
  ]) {
    const result = await usecase.extraerOcrActa(current, current.fotoUri, territorio, ocr(provincia, canton));
    assert.equal(result.verificacionTerritorial, esperado);
    if (esperado !== 'COINCIDE') assert.throws(() => usecase.exigirTerritorioVerificado(esperado));
  }
});

test('missing reference territory prevents OCR instead of guessing', async () => {
  await assert.rejects(usecase.extraerOcrActa(
    acta('PENDING_OCR'), 'file://foto',
    { obtenerRecintoPorMesa: async () => null },
    { extraerVotos: async () => assert.fail('OCR must not run without the expected territory') },
  ), /No se encontró la provincia y el cantón/);
});

function repository(initialActa, ocrService = ocr('Guayas', 'Durán')) {
  let current = initialActa;
  const uploads = [];
  const local = {
    obtenerPorId: async () => current,
    actualizar: async (value) => { current = value; },
  };
  const remote = {
    obtenerPorId: async () => current,
    guardarActa: async (value) => { uploads.push(value); return 'storage'; },
  };
  const repo = new ActaRepository(local, remote, { estaConectado: async () => true }, territorio, ocrService);
  return { repo, uploads, actual: () => current };
}

test('unverified, unreadable and mismatched acts cannot be confirmed or automatically synchronized', async () => {
  for (const status of [null, 'NO_VERIFICABLE', 'NO_COINCIDE']) {
    const confirmation = repository(acta('NEEDS_CONFIRMATION', status));
    await assert.rejects(confirmation.repo.confirmarParaSincronizacion('acta', votos, 'user'));
    assert.equal(confirmation.actual().estado, 'NEEDS_CONFIRMATION');
    const pending = repository(acta('PENDING_SYNC', status));
    await assert.rejects(pending.repo.sincronizarPendiente('acta'));
    await assert.rejects(pending.repo.marcarSincronizada('acta'));
    assert.equal(pending.actual().estado, 'PENDING_SYNC');
    assert.deepEqual(pending.uploads, []);
  }
});

test('verified act still requires manual confirmation before it can synchronize', async () => {
  const { repo, uploads, actual } = repository(acta('NEEDS_CONFIRMATION', 'COINCIDE'));
  await assert.rejects(repo.sincronizarPendiente('acta'), /Solo se pueden sincronizar/);
  await repo.confirmarParaSincronizacion('acta', votos, 'user');
  await repo.sincronizarPendiente('acta');
  assert.equal(uploads.length, 1);
  assert.equal(actual().estado, 'SYNCED');
});

test('replacing a pending photo resets its verification and preserves votes until OCR completes', async () => {
  for (const estado of ['NEEDS_CONFIRMATION', 'PENDING_SYNC']) {
    const { repo, actual } = repository(acta(estado, 'COINCIDE'));
    await repo.reiniciarOcr('acta', 'file://nueva');
    assert.equal(actual().estado, 'PENDING_OCR');
    assert.equal(actual().fotoUri, 'file://nueva');
    assert.equal(actual().verificacionTerritorial, null);
    assert.deepEqual(actual().votosCandidatos, votos.votosCandidatos);
  }
});

test('corrections verify the actual photo before uploading', async () => {
  const urls = [];
  const failing = repository(acta('SYNCED'), {
    extraerVotos: async (url) => {
      urls.push(url);
      return { ...votos, provinciaLeida: 'Guayas', cantonLeido: 'Quito' };
    },
  });
  await assert.rejects(
    failing.repo.corregirActaSincronizada('acta', votos, 'file://nueva', 'user'),
    /otra provincia o cantón/,
  );
  assert.deepEqual(urls, ['file://nueva']);
  assert.deepEqual(failing.uploads, []);
  const success = repository(acta('SYNCED'), ocr('Guayas', 'Durán'));
  await success.repo.corregirActaSincronizada('acta', votos, 'file://nueva', 'user');
  assert.equal(success.uploads[0].fotoUri, 'file://nueva');
});

test('corrections with an old signed URL verify the current stored photo', async () => {
  const seen = [];
  const current = { ...acta('SYNCED'), fotoUri: 'https://example.test/current', fotoStoragePath: 'current.jpg' };
  const { repo, uploads } = repository(current, {
    extraerVotos: async (url) => {
      seen.push(url);
      return { ...votos, provinciaLeida: 'Guayas', cantonLeido: 'Durán' };
    },
  });
  await repo.corregirActaSincronizada('acta', votos, 'https://example.test/old', 'user');
  assert.deepEqual(seen, ['https://example.test/current']);
  assert.equal(uploads[0].fotoStoragePath, 'current.jpg');
});
