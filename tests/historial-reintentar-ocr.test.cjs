/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'presentation', 'screens', 'actas', 'HistorialActasScreen.tsx'),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(actas, procesarActa) {
  const states = [];
  const refs = [];
  const actions = [];
  const reports = [];
  let stateIndex = 0;
  let refIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {
      useState: (initial) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useRef: (initial) => {
        const index = refIndex++;
        if (!(index in refs)) refs[index] = { current: initial };
        return refs[index];
      },
      useEffect: () => {},
      useCallback: (callback) => callback,
      useMemo: (callback) => callback(),
    },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', RefreshControl: 'RefreshControl',
      ScrollView: 'ScrollView', Text: 'Text', View: 'View',
    },
    'expo-router': { router: {}, useFocusEffect: () => {} },
    '@/presentation/components/auth/FeedbackBottomSheet': { FeedbackBottomSheet: 'FeedbackBottomSheet' },
    '@/presentation/store': {
      useAppSelector: (selector) => selector({
        auth: { perfil: { id: 'veedor' } },
        historial: { actas, cargando: false, cargado: true, error: null },
      }),
      useAppDispatch: () => (action) => { actions.push(action); return Promise.resolve(action); },
    },
    '@/presentation/store/slices/actaSlice': { avisarActaLista: (id) => ({ type: 'aviso', id }) },
    '@/presentation/store/slices/historialSlice': { cargarHistorialActas: (id) => ({ type: 'cargar', id }) },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  const props = {
    processingService: { procesarActa },
    crashReportingService: { registrarError: async (...args) => reports.push(args) },
  };
  return {
    render: () => {
      stateIndex = 0;
      refIndex = 0;
      return module.exports.HistorialActasScreen(props);
    },
    actions,
    reports,
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

function acta(id, estado = 'PENDING_OCR', creadoPor = 'veedor') {
  return { id, estado, creadoPor, dignidad: 'ALCALDE', mesaJrvId: id, actualizadoEn: '2026-01-01' };
}

function boton(tree, id) {
  return find(tree, (node) => node.props?.accessibilityLabel === `Reintentar OCR, ALCALDE · Mesa ${id}`);
}

test('only pending OCR belonging to the current user has a retry button', () => {
  const component = setup([
    acta('pendiente'),
    acta('ajena', 'PENDING_OCR', 'otro'),
    acta('procesando', 'PROCESSING_OCR'),
    acta('lista', 'NEEDS_CONFIRMATION'),
  ], async () => {});
  const tree = component.render();
  assert.ok(boton(tree, 'pendiente'));
  for (const id of ['ajena', 'procesando', 'lista']) assert.equal(boton(tree, id), undefined);
});

test('retry blocks duplicate attempts and queues human review after success', async () => {
  let resolver;
  let calls = 0;
  const component = setup([acta('uno'), acta('dos')], () => {
    calls += 1;
    return new Promise((resolve) => { resolver = resolve; });
  });
  const first = boton(component.render(), 'uno');
  first.props.onPress();
  first.props.onPress();
  const busyTree = component.render();
  assert.equal(calls, 1);
  assert.equal(boton(busyTree, 'uno').props.accessibilityState.busy, true);
  assert.equal(boton(busyTree, 'dos').props.disabled, true);
  resolver(acta('uno', 'NEEDS_CONFIRMATION'));
  await new Promise(setImmediate);
  assert.deepEqual(component.actions, [{ type: 'aviso', id: 'uno' }, { type: 'cargar', id: 'veedor' }]);
  assert.equal(boton(component.render(), 'uno').props.disabled, false);
});

test('offline retry stays pending and explains that no processing occurred', async () => {
  const component = setup([acta('uno')], async () => acta('uno'));
  boton(component.render(), 'uno').props.onPress();
  await new Promise(setImmediate);
  const feedback = find(component.render(), (node) => node.type === 'FeedbackBottomSheet').props.content;
  assert.equal(feedback.title, 'OCR pendiente');
  assert.match(feedback.message, /No hay conexión/);
  assert.deepEqual(component.actions, [{ type: 'cargar', id: 'veedor' }]);
});

test('failed retry reports the error and allows another attempt', async () => {
  const component = setup([acta('uno')], async () => { throw new Error('Error de OCR'); });
  boton(component.render(), 'uno').props.onPress();
  await new Promise(setImmediate);
  const tree = component.render();
  assert.match(find(tree, (node) => node.type === 'FeedbackBottomSheet').props.content.message, /Error de OCR/);
  assert.equal(component.reports[0][1].actaId, 'uno');
  assert.equal(component.reports[0][1].operacion, 'reintentar_ocr_acta');
  assert.equal(boton(tree, 'uno').props.disabled, false);
  assert.deepEqual(component.actions, [{ type: 'cargar', id: 'veedor' }]);
});

test('a concurrent state change is not reported as OCR success', async () => {
  const component = setup([acta('uno')], async () => acta('uno', 'PENDING_SYNC'));
  boton(component.render(), 'uno').props.onPress();
  await new Promise(setImmediate);
  const feedback = find(component.render(), (node) => node.type === 'FeedbackBottomSheet').props.content;
  assert.equal(feedback.title, 'Estado actualizado');
  assert.deepEqual(component.actions, [{ type: 'cargar', id: 'veedor' }]);
});
