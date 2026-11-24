/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadModule(relativePath, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

const jsx = (type, props) => ({ type, props });
const { PieChartResultados } = loadModule(
  path.join('src', 'presentation', 'components', 'monitoreo', 'PieChartResultados.tsx'),
  {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text' },
    'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle', Path: 'Path' },
  },
);
const { mapearResultadosAGrafico, mapearVotosBlancosNulos } = loadModule(
  path.join('src', 'presentation', 'components', 'monitoreo', 'chartUtils.ts'),
  {},
);

function collect(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (predicate(node)) matches.push(node);
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    collect(child, predicate, matches);
  }
  return matches;
}

function dato(id, votos) {
  return { id, nombre: id, organizacion: 'Lista', votos, color: id === 'a' ? '#123456' : '#654321' };
}

test('chart displays percentages of candidate votes and draws the corresponding sectors', () => {
  const tree = PieChartResultados({ datos: [dato('a', 25), dato('b', 75)] });
  const text = collect(tree, (node) => node.type === 'Text').map((node) => node.props.children);
  assert.ok(text.some((children) => Array.isArray(children) && children.join('') === '25.0%'));
  assert.ok(text.some((children) => Array.isArray(children) && children.join('') === '75.0%'));
  const sectors = collect(tree, (node) => node.type === 'Path');
  assert.equal(sectors.length, 2);
  assert.match(sectors[0].props.d, / A 80 80 0 0 0 /);
  assert.match(sectors[1].props.d, / A 80 80 0 1 0 /);
});

test('one candidate with all votes fills the circle and zero-vote candidates remain in the legend', () => {
  const tree = PieChartResultados({ datos: [dato('a', 10), dato('b', 0)] });
  assert.equal(collect(tree, (node) => node.type === 'Circle').length, 1);
  assert.equal(collect(tree, (node) => node.type === 'Path').length, 0);
  const text = collect(tree, (node) => node.type === 'Text').map((node) => node.props.children);
  assert.ok(text.some((children) => Array.isArray(children) && children.join('') === '100.0%'));
  assert.ok(text.some((children) => Array.isArray(children) && children.join('') === '0.0%'));
});

test('no votes shows an empty state without dividing by zero', () => {
  const tree = PieChartResultados({ datos: [dato('a', 0)] });
  assert.ok(collect(tree, (node) => node.type === 'Text'
    && node.props.children === 'Sin votos registrados en esta selección.').length);
  assert.equal(collect(tree, (node) => node.type === 'Svg').length, 0);
});

test('candidate colors remain stable when the selected results change order or subset', () => {
  const results = [
    { candidatoId: 'b', candidato: 'B', organizacion: 'O', lista: '2', votos: 20, dignidad: 'ALCALDE' },
    { candidatoId: 'a', candidato: 'A', organizacion: 'O', lista: '1', votos: 10, dignidad: 'ALCALDE' },
  ];
  const both = mapearResultadosAGrafico(results, ['a', 'b']);
  const subset = mapearResultadosAGrafico([results[1]], ['a', 'b']);
  assert.equal(both[1].color, subset[0].color);
  assert.notEqual(both[0].color, both[1].color);
  assert.equal(subset[0].organizacion, 'O · Lista 1');
});

test('blank and null votes are included in percentages and displayed even when one is zero', () => {
  const tree = PieChartResultados({
    datos: [dato('a', 60), ...mapearVotosBlancosNulos(20, 20)],
  });
  const text = collect(tree, (node) => node.type === 'Text').map((node) => node.props.children);
  assert.ok(text.includes('Votos blancos'));
  assert.ok(text.includes('Votos nulos'));
  assert.ok(text.some((children) => Array.isArray(children) && children.join('') === '60.0%'));
  assert.equal(text.filter((children) => Array.isArray(children) && children.join('') === '20.0%').length, 2);
  const zeroTree = PieChartResultados({ datos: [dato('a', 10), ...mapearVotosBlancosNulos(0, 0)] });
  const zeroText = collect(zeroTree, (node) => node.type === 'Text').map((node) => node.props.children);
  assert.ok(zeroText.includes('Votos blancos'));
  assert.ok(zeroText.includes('Votos nulos'));
  assert.equal(zeroText.filter((children) => Array.isArray(children) && children.join('') === '0.0%').length, 2);
});
