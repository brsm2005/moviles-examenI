/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'components', 'usuarios', 'EditarNombreBottomSheet.tsx'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(submit) {
  const states = [];
  const refs = [];
  const effectDeps = [];
  const effects = [];
  let stateIndex = 0;
  let refIndex = 0;
  let effectIndex = 0;
  let presented = 0;
  let closed = 0;
  let succeeded = 0;
  let modalProps;
  let formValue = '';
  const modal = {
    present: () => { presented += 1; },
    dismiss: () => modalProps.onDismiss(),
  };
  const jsx = (type, props) => {
    if (type === 'Modal') {
      props.ref.current = modal;
      modalProps = props;
    }
    return { type, props };
  };
  const reset = (value) => { formValue = value.nuevoNombre; };
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
      useEffect: (effect, deps) => {
        const index = effectIndex++;
        if (!effectDeps[index] || deps.some((value, i) => value !== effectDeps[index][i])) {
          effectDeps[index] = deps;
          effects.push(effect);
        }
      },
    },
    'react-native': { Keyboard: { dismiss: () => {} }, Pressable: 'Pressable', Text: 'Text', View: 'View' },
    '@gorhom/bottom-sheet': { BottomSheetBackdrop: 'Backdrop', BottomSheetModal: 'Modal', BottomSheetScrollView: 'ScrollView', BottomSheetTextInput: 'Input' },
    '@hookform/resolvers/zod': { zodResolver: () => () => {} },
    'react-hook-form': {
      Controller: 'Controller',
      useForm: () => ({
        control: {}, formState: { isSubmitting: false }, reset,
        handleSubmit: (callback) => () => callback({ nuevoNombre: formValue }),
      }),
    },
    '@/domain/schemas/usuariosSchemas': { editarNombreSchema: {} },
    '@/presentation/store': { useAppDispatch: () => (action) => ({ unwrap: () => submit(action) }) },
    '@/presentation/store/slices/authSlice': { actualizarNombrePropio: (name) => name },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return {
    render: (isOpen, nombreActual = 'Nombre anterior') => {
      stateIndex = 0; refIndex = 0; effectIndex = 0;
      const tree = module.exports.EditarNombreBottomSheet({
        isOpen, nombreActual, onClose: () => { closed += 1; }, onSuccess: () => { succeeded += 1; },
      });
      while (effects.length) effects.shift()();
      return tree;
    },
    setName: (name) => { formValue = name; },
    get presented() { return presented; },
    get closed() { return closed; },
    get succeeded() { return succeeded; },
    get name() { return formValue; },
  };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) {
    const found = find(child, predicate);
    if (found) return found;
  }
}

function saveButton(tree) {
  return find(tree, (node) => node.type === 'Pressable' && find(node, (child) => child.type === 'Text' && child.props.children === 'Guardar cambios'));
}

test('opening and saving uses a modal and reports success after dismissal', async (t) => {
  const previous = global.requestAnimationFrame;
  global.requestAnimationFrame = (callback) => { callback(); return 1; };
  t.after(() => { global.requestAnimationFrame = previous; });
  const submitted = [];
  const screen = setup(async (name) => { submitted.push(name); });
  screen.render(false);
  let tree = screen.render(true);
  assert.equal(screen.presented, 1);
  assert.equal(screen.name, 'Nombre anterior');
  screen.setName('Nombre nuevo');
  saveButton(tree).props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(submitted, ['Nombre nuevo']);
  assert.equal(screen.closed, 1);
  assert.equal(screen.succeeded, 1);
  tree = screen.render(true, 'Nombre nuevo');
  assert.equal(screen.presented, 1, 'profile refresh must not reopen the modal');
});

test('failed save keeps the modal open and shows the returned error', async (t) => {
  const previous = global.requestAnimationFrame;
  global.requestAnimationFrame = (callback) => { callback(); return 1; };
  t.after(() => { global.requestAnimationFrame = previous; });
  const screen = setup(async () => { throw 'Sin conexión'; });
  screen.render(false);
  const tree = screen.render(true);
  saveButton(tree).props.onPress();
  await new Promise(setImmediate);
  assert.equal(screen.closed, 0);
  assert.equal(screen.succeeded, 0);
  assert.ok(find(screen.render(true), (node) => node.type === 'Text' && node.props.children === 'Sin conexión'));
});

test('duplicate save taps do not start a second request', async (t) => {
  const previous = global.requestAnimationFrame;
  global.requestAnimationFrame = (callback) => { callback(); return 1; };
  t.after(() => { global.requestAnimationFrame = previous; });
  let resolve;
  let calls = 0;
  const screen = setup(() => {
    calls += 1;
    return new Promise((done) => { resolve = done; });
  });
  screen.render(false);
  const button = saveButton(screen.render(true));
  button.props.onPress();
  button.props.onPress();
  assert.equal(calls, 1);
  resolve();
  await new Promise(setImmediate);
});

test('profile button opens the name editor', () => {
  const sourceScreen = fs.readFileSync(path.join(__dirname, '..', 'src', 'presentation', 'screens', 'AjustesScreen.tsx'), 'utf8');
  const screenJs = ts.transpileModule(sourceScreen, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const states = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useState: (initial) => {
      const current = index++;
      if (!(current in states)) states[current] = initial;
      return [states[current], (value) => { states[current] = value; }];
    } },
    'expo-router': { Redirect: 'Redirect', router: {} },
    'react-native': { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@/presentation/components/auth/FeedbackBottomSheet': { FeedbackBottomSheet: 'Feedback' },
    '@/presentation/components/usuarios/EditarNombreBottomSheet': { EditarNombreBottomSheet: 'Editor' },
    '@/presentation/navigation/roleRoutes': { routeForRole: () => '/' },
    '@/presentation/navigation/volverSeguro': { volverSeguro: () => {} },
    '@/presentation/store': { useAppSelector: (selector) => selector({
      auth: { perfil: { id: 'u', nombresCompletos: 'Nombre anterior', rol: 'VEEDOR' }, inicializando: false },
    }) },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', screenJs)((name) => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  const render = () => { index = 0; return module.exports.AjustesScreen({ crashReporting: {} }); };
  let tree = render();
  assert.equal(find(tree, (node) => node.type === 'Editor').props.isOpen, false);
  find(tree, (node) => node.props?.accessibilityLabel === 'Editar nombre').props.onPress();
  tree = render();
  assert.equal(find(tree, (node) => node.type === 'Editor').props.isOpen, true);
});
