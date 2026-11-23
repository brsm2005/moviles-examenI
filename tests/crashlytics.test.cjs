/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'infrastructure', 'monitoring', 'crashlytics.ts'),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function createService(appOwnership, loadCrashlytics, consoleMock) {
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === 'expo-constants') return { __esModule: true, default: { appOwnership } };
    if (name === '@react-native-firebase/crashlytics') return loadCrashlytics();
    throw new Error(`Unexpected dependency: ${name}`);
  };
  new Function('require', 'module', 'exports', 'console', javascript)(
    requireMock, module, module.exports, consoleMock,
  );
  return new module.exports.FirebaseCrashlyticsService();
}

test('Expo Go logs the original error and context without loading Firebase', async () => {
  const logs = [];
  const service = createService('expo', () => {
    throw new Error('Firebase must not load in Expo Go');
  }, { error: (...args) => logs.push(args) });
  const error = new Error('offline');
  await service.registrarError(error, { pantalla: 'captura', operacion: 'guardar' });
  assert.deepEqual(logs, [[
    'Error operativo:', error,
    { rol: 'sin_sesion', pantalla: 'captura', operacion: 'guardar', acta_id: 'no_aplica' },
  ]]);
});

test('native builds report errors in order with their own attributes', async () => {
  const events = [];
  const instance = {};
  const service = createService(null, () => ({
    getCrashlytics: () => instance,
    setAttributes: async (target, attributes) => {
      assert.equal(target, instance);
      events.push(['attributes', attributes]);
    },
    recordError: (target, error) => {
      assert.equal(target, instance);
      events.push(['error', error]);
    },
  }), { error: () => assert.fail('Unexpected fallback') });
  const first = new Error('first');
  const second = new Error('second');
  service.establecerRol('VEEDOR');
  await Promise.all([
    service.registrarError(first, { pantalla: 'captura', operacion: 'guardar', actaId: '123' }),
    service.registrarError(second, { pantalla: 'ocr', operacion: 'procesar' }),
  ]);
  assert.deepEqual(events, [
    ['attributes', { rol: 'VEEDOR', pantalla: 'captura', operacion: 'guardar', acta_id: '123' }],
    ['error', first],
    ['attributes', { rol: 'VEEDOR', pantalla: 'ocr', operacion: 'procesar', acta_id: 'no_aplica' }],
    ['error', second],
  ]);
});

test('native failures remain visible and do not block later reports', async () => {
  const failure = new Error('Firebase unavailable');
  const logs = [];
  let attempts = 0;
  const reported = [];
  const service = createService(null, () => {
    if (++attempts === 1) throw failure;
    return {
      getCrashlytics: () => ({}),
      setAttributes: async () => {},
      recordError: (_, error) => reported.push(error),
    };
  }, { error: (...args) => logs.push(args) });
  const context = { pantalla: 'ocr', operacion: 'procesar' };
  await assert.rejects(service.registrarError(new Error('first'), context), failure);
  const second = new Error('second');
  await service.registrarError(second, context);
  assert.deepEqual(logs, [['No se pudo registrar el error en Crashlytics:', failure]]);
  assert.deepEqual(reported, [second]);
});
