/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'infrastructure', 'ai', 'GeminiActaOcrService.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function createService(response, downloadError) {
  const calls = { downloads: [], deleted: [], reads: [], prompts: [] };
  class File {
    constructor(...args) { this.name = args.join('/'); this.exists = false; }
    async base64() { calls.reads.push(this.name); return 'base64-image'; }
    delete() { calls.deleted.push(this.name); this.exists = false; }
    static async downloadFileAsync(url, file) {
      calls.downloads.push(url);
      file.exists = true;
      if (downloadError) throw downloadError;
      return file;
    }
  }
  class GoogleGenerativeAI {
    getGenerativeModel(config) {
      calls.config = config;
      return { generateContent: async (prompt) => {
        calls.prompts.push(prompt);
        return { response: { text: () => JSON.stringify(response) } };
      } };
    }
  }
  const dependencies = {
    '@google/generative-ai': { GoogleGenerativeAI, SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING', INTEGER: 'INTEGER', ARRAY: 'ARRAY' } },
    'expo-file-system': { File, Paths: { cache: 'cache' } },
    'react-native-get-random-values': {},
    uuid: { v4: () => 'uuid' },
    zod: require('zod'),
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return { service: new module.exports.GeminiActaOcrService(), calls };
}

const response = {
  provinciaLeida: 'Guayas', cantonLeido: null, totalSufragantes: 5,
  votosBlancos: 0, votosNulos: 0, votosCandidatos: Array.from({ length: 5 }, () => ({ votos: 1 })),
};
const candidatos = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, nombresCompletos: `Candidato ${i}` }));

test('OCR requests independent readings with expected jurisdiction and maps candidate IDs', async (t) => {
  const previous = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
  t.after(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    else process.env.EXPO_PUBLIC_GEMINI_API_KEY = previous;
  });
  const { service, calls } = createService(response);
  const result = await service.extraerVotos('file://foto', 'ALCALDE', candidatos, { provincia: 'Guayas', canton: 'Durán' });
  assert.match(calls.prompts[0][0], /Guayas/);
  assert.match(calls.prompts[0][0], /Durán/);
  assert.match(calls.prompts[0][0], /Nunca copies la jurisdicción esperada ni la infieras/);
  assert.equal(calls.config.generationConfig.responseSchema.properties.cantonLeido.nullable, true);
  assert.equal(result.cantonLeido, null);
  assert.deepEqual(result.votosCandidatos.map((voto) => voto.candidatoId), candidatos.map((c) => c.id));
});

test('remote photos are downloaded and temporary copies removed, including download failures', async (t) => {
  const previous = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
  t.after(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    else process.env.EXPO_PUBLIC_GEMINI_API_KEY = previous;
  });
  const { service, calls } = createService(response);
  await service.extraerVotos('https://example.test/acta', 'ALCALDE', candidatos, { provincia: 'Guayas', canton: 'Durán' });
  assert.deepEqual(calls.downloads, ['https://example.test/acta']);
  assert.deepEqual(calls.reads, ['cache/ocr-uuid.jpg']);
  assert.deepEqual(calls.deleted, ['cache/ocr-uuid.jpg']);
  const failed = createService(response, new Error('descarga fallida'));
  await assert.rejects(failed.service.extraerVotos(
    'https://example.test/acta', 'ALCALDE', candidatos, { provincia: 'Guayas', canton: 'Durán' },
  ), /descarga fallida/);
  assert.deepEqual(failed.calls.deleted, ['cache/ocr-uuid.jpg']);
});
