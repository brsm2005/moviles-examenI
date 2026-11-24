/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadModule(relativePath, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}

function setup() {
  const avance = (recintoId, nombre, canton) => ({
    recintoId, nombre, canton, parroquia: 'Centro', mesasReportadas: 1, totalMesas: 2,
    mesasFaltantes: 1, actasReportadas: 1, actasFaltantes: 1, alertas: 0,
  });
  const datos = {
    avances: [
      avance('a1', 'Recinto uno', 'A'),
      avance('a2', 'Recinto dos', 'A'),
      avance('b1', 'Recinto tres', 'B'),
    ],
    resultados: [
      { recintoId: 'a1', dignidad: 'ALCALDE', candidatoId: 'c', candidato: 'Candidato', organizacion: 'O', lista: '1', votos: 10 },
      { recintoId: 'a2', dignidad: 'ALCALDE', candidatoId: 'c', candidato: 'Candidato', organizacion: 'O', lista: '1', votos: 20 },
      { recintoId: 'b1', dignidad: 'ALCALDE', candidatoId: 'c', candidato: 'Candidato', organizacion: 'O', lista: '1', votos: 30 },
    ],
    actas: [
      { id: 'acta-a1', recintoId: 'a1', mesa: 1, genero: 'F', dignidad: 'ALCALDE' },
      { id: 'acta-a2', recintoId: 'a2', mesa: 2, genero: 'M', dignidad: 'ALCALDE' },
    ],
  };
  const states = [];
  let stateIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const filtrar = loadModule(path.join('src', 'domain', 'usecases', 'filtrarMonitoreo.ts'), {});
  const Picker = Object.assign('Picker', { Item: 'PickerItem' });
  const screen = loadModule(path.join('src', 'presentation', 'screens', 'provincial', 'MonitoreoProvincialScreen.tsx'), {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    react: {
      useState: (initial) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useEffect: () => {},
      useMemo: (callback) => callback(),
    },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', RefreshControl: 'RefreshControl',
      ScrollView: 'ScrollView', Text: 'Text', View: 'View',
    },
    'expo-router': { router: {} },
    '@expo/ui/community/picker': { Picker },
    '@/domain/usecases/filtrarMonitoreo': filtrar,
    '@/presentation/navigation/volverSeguro': { volverSeguro: () => {} },
    '@/presentation/store': {
      useAppSelector: (selector) => selector({ monitoreo: { datos, cargando: false, error: null } }),
      useAppDispatch: () => () => {},
    },
    '@/presentation/store/slices/monitoreoSlice': { cargarMonitoreo: () => {} },
  });
  return {
    datos,
    render: () => {
      stateIndex = 0;
      return screen.MonitoreoProvincialScreen({ monitoreo: {} });
    },
  };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  if (typeof node.type === 'function') return find(node.type(node.props), predicate);
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

test('selecting a recinto filters progress, results and audit records; total restores the canton', () => {
  const component = setup();
  let tree = component.render();
  let picker = find(tree, (node) => node.props?.testID === 'selector-recinto');
  assert.equal(picker.props.selectedValue, '');
  assert.deepEqual(picker.props.children.flat().map((item) => item.props.label), [
    'Total cantonal', 'Recinto uno', 'Recinto dos',
  ]);
  picker.props.onValueChange('a2');
  tree = component.render();
  picker = find(tree, (node) => node.props?.testID === 'selector-recinto');
  assert.equal(picker.props.selectedValue, 'a2');
  assert.equal(find(tree, (node) => node.type === 'Text' && node.props.children === '20').props.children, '20');
  assert.equal(find(tree, (node) => node.type === 'Text' && node.props.children?.[0] === 'Recinto uno'), undefined);
  assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children?.[0] === 'Recinto dos'));
  picker.props.onValueChange('');
  tree = component.render();
  assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children === '30'));
  assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children?.[0] === 'Recinto uno'));
});

test('changing canton resets the selected recinto and updates the available options', () => {
  const component = setup();
  let tree = component.render();
  find(tree, (node) => node.props?.testID === 'selector-recinto').props.onValueChange('a2');
  tree = component.render();
  const cantonB = find(tree, (node) => node.type === 'Pressable'
    && node.props.accessibilityState?.selected === false && node.props.children?.props?.children === 'B');
  cantonB.props.onPress();
  tree = component.render();
  const picker = find(tree, (node) => node.props?.testID === 'selector-recinto');
  assert.equal(picker.props.selectedValue, '');
  assert.deepEqual(picker.props.children.flat().map((item) => item.props.label), ['Total cantonal', 'Recinto tres']);
});
