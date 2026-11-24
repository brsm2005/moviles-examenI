/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'screens', 'actas', 'VerificacionActaScreen.tsx'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(estado, verificacionTerritorial) {
  let current = {
    id: 'a', creadoPor: 'u', estado, verificacionTerritorial, fotoUri: 'file://foto',
    mesaJrvId: 'm', dignidad: 'ALCALDE', totalSufragantes: 0, votosBlancos: 0,
    votosNulos: 0, votosCandidatos: [], alertaUbicacion: false,
  };
  const states = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  let effectStarted = false;
  let calls = 0;
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
      useMemo: (callback) => callback(),
      useEffect: (effect) => { if (!effectStarted) { effectStarted = true; effect(); } },
    },
    'react-native': { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, async () => ({ granted: true })] },
    'expo-image': { Image: 'Image' },
    'lottie-react-native': { __esModule: true, default: 'Lottie' },
    'expo-router': { useLocalSearchParams: () => ({ actaId: 'a' }) },
    '@gorhom/bottom-sheet': { BottomSheetBackdrop: 'Backdrop', BottomSheetModal: 'Modal', BottomSheetView: 'SheetView' },
    '@hookform/resolvers/zod': { zodResolver: () => () => {} },
    'react-hook-form': {
      Controller: 'Controller',
      useForm: () => ({ control: {}, handleSubmit: () => () => {}, getValues: () => ({}), reset: () => {}, formState: {} }),
      useFieldArray: () => ({ fields: [] }),
    },
    'react-native-gesture-handler': { Gesture: {}, GestureDetector: 'GestureDetector' },
    'react-native-reanimated': { __esModule: true, default: {}, useAnimatedStyle: () => {}, useSharedValue: () => {} },
    '@/domain/schemas/actaVerificacionSchema': { actaVerificacionSchema: {} },
    '@/presentation/components/auth/FeedbackBottomSheet': { FeedbackBottomSheet: 'FeedbackBottomSheet' },
    '@/presentation/navigation/volverSeguro': { volverSeguro: () => {} },
    '@/presentation/store': { useAppSelector: (selector) => selector({ auth: { perfil: { id: 'u', rol: 'VEEDOR' } } }) },
    '../../../../assets/animations/status-error.json': {},
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  const props = {
    actaRepository: {
      obtenerPorId: async () => current,
      reiniciarOcr: async (_, foto) => { current = { ...current, fotoUri: foto, estado: 'PENDING_OCR', verificacionTerritorial: null }; },
    },
    territorioRepository: { obtenerCandidatosPorIds: async () => [] },
    processingService: { procesarActa: async () => { calls += 1; return current; } },
    crashReportingService: { registrarError: async () => {} },
    photoStorageService: {},
    imageQualityService: {},
  };
  return {
    render: () => { stateIndex = 0; refIndex = 0; return module.exports.VerificacionActaScreen(props); },
    get calls() { return calls; },
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

function button(tree, label) {
  return find(tree, (node) => node.type === 'Pressable' && find(node, (child) => child.type === 'Text' && child.props.children === label));
}

test('mismatched territory displays a warning and disables sending', async () => {
  const screen = setup('NEEDS_CONFIRMATION', 'NO_COINCIDE');
  screen.render();
  await new Promise(setImmediate);
  const tree = screen.render();
  assert.ok(find(tree, (node) => node.type === 'Text' && node.props.children === 'El acta es de otra provincia o cantón'));
  assert.equal(button(tree, 'Confirmar y enviar acta').props.disabled, true);
  assert.ok(button(tree, 'Reemplazar fotografía con la cámara'));
});

test('legacy pending sync can replace its photo and retry without losing it offline', async () => {
  const screen = setup('PENDING_SYNC', null);
  screen.render();
  await new Promise(setImmediate);
  let tree = screen.render();
  assert.equal(button(tree, 'Reintentar envío').props.disabled, true);
  assert.ok(button(tree, 'Reemplazar fotografía con la cámara'));
  button(tree, 'Verificar provincia y cantón').props.onPress();
  await new Promise(setImmediate);
  tree = screen.render();
  assert.equal(screen.calls, 1);
  assert.ok(button(tree, 'Reintentar OCR'));
  assert.match(find(tree, (node) => node.type === 'FeedbackBottomSheet').props.content.message, /fotografía está guardada/i);
});
