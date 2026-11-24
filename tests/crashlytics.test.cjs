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

function createService(expoGo, loadCrashlytics, consoleMock = console) {
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === 'expo-constants') {
      return {
        __esModule: true,
        default: { executionEnvironment: expoGo ? 'storeClient' : 'standalone' },
        ExecutionEnvironment: { StoreClient: 'storeClient' },
      };
    }
    if (name === '@react-native-firebase/crashlytics') return loadCrashlytics();
    throw new Error(`Unexpected dependency: ${name}`);
  };
  new Function('require', 'module', 'exports', 'console', javascript)(
    requireMock, module, module.exports, consoleMock,
  );
  return new module.exports.FirebaseCrashlyticsService();
}

const context = { pantalla: 'captura', operacion: 'guardar' };

test('Expo Go reports unavailability instead of diagnostic success', async () => {
  const service = createService(true, () => assert.fail('Firebase must not load in Expo Go'));
  await assert.rejects(service.registrarErrorDiagnostico(new Error('test'), context), /Expo Go/);
});

test('native diagnostics preserve the order and context of concurrent reports', async () => {
  const events = [];
  const instance = { isCrashlyticsCollectionEnabled: true };
  const service = createService(false, () => ({
    getCrashlytics: () => instance,
    setAttributes: async (target, attributes) => {
      assert.equal(target, instance);
      events.push(['attributes', attributes]);
    },
    recordError: (target, error) => {
      assert.equal(target, instance);
      events.push(['error', error]);
    },
  }));
  const first = new Error('first');
  const second = new Error('second');
  service.establecerRol('VEEDOR');
  await Promise.all([
    service.registrarErrorDiagnostico(first, { ...context, actaId: '123' }),
    service.registrarErrorDiagnostico(second, { pantalla: 'ocr', operacion: 'procesar' }),
  ]);
  assert.deepEqual(events, [
    ['attributes', { rol: 'VEEDOR', pantalla: 'captura', operacion: 'guardar', acta_id: '123' }],
    ['error', first],
    ['attributes', { rol: 'VEEDOR', pantalla: 'ocr', operacion: 'procesar', acta_id: 'no_aplica' }],
    ['error', second],
  ]);
});

test('disabled collection and attribute failures reject, and a later attempt can succeed', async () => {
  const instance = { isCrashlyticsCollectionEnabled: false };
  const failure = new Error('attribute failure');
  const reported = [];
  let failAttributes = true;
  const service = createService(false, () => ({
    getCrashlytics: () => instance,
    setAttributes: async () => { if (failAttributes) throw failure; },
    recordError: (_, error) => reported.push(error),
  }));
  await assert.rejects(service.registrarErrorDiagnostico(new Error('first'), context), /desactivada/);
  instance.isCrashlyticsCollectionEnabled = true;
  await assert.rejects(service.registrarErrorDiagnostico(new Error('second'), context), failure);
  failAttributes = false;
  const third = new Error('third');
  await service.registrarErrorDiagnostico(third, context);
  assert.deepEqual(reported, [third]);
});

test('operational reporting logs SDK failures without interrupting the caller', async () => {
  const failure = new Error('Firebase unavailable');
  const logs = [];
  const service = createService(false, () => { throw failure; }, {
    error: (...args) => logs.push(args),
  });
  const original = new Error('original');
  await service.registrarError(original, context);
  assert.deepEqual(logs, [['[Crashlytics] No se pudo registrar el error operativo:', failure, original, context]]);
  await assert.rejects(service.registrarErrorDiagnostico(original, context), failure);
});
