/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'presentation', 'screens', 'veedor', 'CapturaActaScreen.tsx'),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(repository, reports) {
  const states = [];
  let stateIndex = 0;
  const effects = [];
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    react: {
      useState: (initial) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => {
          states[index] = typeof value === 'function' ? value(states[index]) : value;
        }];
      },
      useMemo: (callback) => callback(),
      useCallback: (callback) => callback,
      useRef: () => ({ current: null }),
      useEffect: (callback) => effects.push(callback),
    },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView',
      Text: 'Text', View: 'View',
    },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}] },
    'expo-router': { router: {} },
    'react-native-get-random-values': {},
    uuid: { v4: () => 'acta' },
    '@/presentation/components/auth/FeedbackBottomSheet': { FeedbackBottomSheet: 'FeedbackBottomSheet' },
    '@/presentation/store': {
      useAppSelector: (selector) => selector({ auth: { perfil: { id: 'veedor', recintoId: null } } }),
    },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  const props = {
    territorioRepository: repository,
    crashReportingService: { registrarError: async (...args) => reports.push(args) },
  };
  return {
    render: () => { stateIndex = 0; return module.exports.CapturaActaScreen(props); },
    runEffects: () => effects.splice(0).forEach((effect) => effect()),
  };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

test('capture synchronizes before loading assigned mesas and candidates without a profile recinto', async () => {
  const calls = [];
  const component = setup({
    sincronizarCatalogoTerritorial: async () => { calls.push('sync'); return true; },
    listarMesasAsignadas: async () => {
      calls.push('mesas');
      return [
        { id: 'mesa-f', numero: 1, genero: 'FEMENINO' },
        { id: 'mesa-m', numero: 1, genero: 'MASCULINO' },
        { id: 'mesa-mixta', numero: 2, genero: 'MIXTA' },
      ];
    },
    listarCandidatos: async () => {
      calls.push('candidatos');
      return Array.from({ length: 5 }, (_, id) => ({ id, dignidad: 'ALCALDE', nombresCompletos: `C${id}` }));
    },
  }, []);
  component.render();
  component.runEffects();
  await new Promise(setImmediate);
  let tree = component.render();
  assert.deepEqual(calls, ['sync', 'mesas', 'candidatos']);
  for (const label of ['1 F', '1 M', '2 Mixta']) {
    assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children === label));
  }
  assert.ok(find(tree, (node) => node.props?.accessibilityLabel === 'Mesa 1, femenina'));
  const camera = find(tree, (node) => node.type === 'CameraView');
  assert.deepEqual(camera.props.style, { flex: 1 });
  let button = find(tree, (node) => node.props?.accessibilityLabel === 'Tomar fotografía del acta');
  assert.equal(button.props.disabled, true);
  camera.props.onCameraReady();
  tree = component.render();
  button = find(tree, (node) => node.props?.accessibilityLabel === 'Tomar fotografía del acta');
  assert.equal(button.props.disabled, false);
});

test('capture reports a synchronization error without pretending there is no assignment', async () => {
  const reports = [];
  const component = setup({
    sincronizarCatalogoTerritorial: async () => { throw new Error('Error de conexión'); },
    listarMesasAsignadas: async () => assert.fail('Must not read after sync failure'),
    listarCandidatos: async () => assert.fail('Must not read after sync failure'),
  }, reports);
  component.render();
  component.runEffects();
  await new Promise(setImmediate);
  const tree = component.render();
  assert.ok(find(tree, (node) => node.type === 'Text' && typeof node.props.children === 'string'
    && node.props.children.includes('Error de conexión')));
  assert.equal(reports[0][1].operacion, 'cargar_catalogo_veedor');
});

test('camera failures are reported and allow a retry', async () => {
  const reports = [];
  const component = setup({
    sincronizarCatalogoTerritorial: async () => true,
    listarMesasAsignadas: async () => [{ id: 'm', numero: 1, genero: 'FEMENINO' }],
    listarCandidatos: async () => Array.from(
      { length: 5 }, (_, id) => ({ id, dignidad: 'ALCALDE', nombresCompletos: `C${id}` }),
    ),
  }, reports);
  component.render();
  component.runEffects();
  await new Promise(setImmediate);
  let tree = component.render();
  find(tree, (node) => node.type === 'CameraView').props.onMountError({ message: 'Cámara ocupada' });
  tree = component.render();
  assert.ok(find(tree, (node) => node.type === 'Text'
    && Array.isArray(node.props.children)
    && node.props.children.includes('Cámara ocupada')));
  assert.equal(reports[0][1].operacion, 'iniciar_camara');
  assert.equal(find(tree, (node) => node.props?.accessibilityLabel === 'Tomar fotografía del acta').props.disabled, true);
  const retryText = find(tree, (node) => node.type === 'Text' && node.props.children === 'Reintentar cámara');
  const retry = find(tree, (node) => node.type === 'Pressable' && node.props.children === retryText);
  retry.props.onPress();
  tree = component.render();
  assert.equal(find(tree, (node) => node.type === 'Text' && node.props.children === 'Reintentar cámara'), undefined);
});

test('capture explains when the list does not contain five candidates', async () => {
  const component = setup({
    sincronizarCatalogoTerritorial: async () => true,
    listarMesasAsignadas: async () => [{ id: 'm', numero: 1, genero: 'FEMENINO' }],
    listarCandidatos: async () => [{ id: 'c', dignidad: 'ALCALDE', nombresCompletos: 'C' }],
  }, []);
  component.render();
  component.runEffects();
  await new Promise(setImmediate);
  let tree = component.render();
  find(tree, (node) => node.type === 'CameraView').props.onCameraReady();
  tree = component.render();
  assert.equal(find(tree, (node) => node.props?.accessibilityLabel === 'Tomar fotografía del acta').props.disabled, true);
  assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children ===
    'Se requieren cinco candidatos para ALCALDE; hay 1 disponibles.'));
  assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children === 'Actualizar mesas y candidatos'));
});
