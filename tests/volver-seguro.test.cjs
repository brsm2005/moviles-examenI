/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'presentation', 'navigation', 'volverSeguro.ts'),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(canGoBack) {
  const calls = [];
  const router = {
    canGoBack: () => canGoBack,
    back: () => calls.push('back'),
    replace: (href) => calls.push(href),
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name === 'expo-router') return { router };
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return { ...module.exports, calls };
}

test('returns to the previous screen when navigation history exists', () => {
  const navigation = setup(true);
  navigation.volverSeguro('/(actas)/historial');
  assert.deepEqual(navigation.calls, ['back']);
});

test('replaces the route with its fallback when there is no history', () => {
  const navigation = setup(false);
  navigation.volverSeguro('/(actas)/historial');
  assert.deepEqual(navigation.calls, ['/(actas)/historial']);
});
