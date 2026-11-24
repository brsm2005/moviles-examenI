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

function setup(perfil) {
  const actions = [];
  const navigations = [];
  let focus;
  const jsx = (type, props) => ({ type, props });
  const screen = loadModule(path.join('src', 'presentation', 'screens', 'usuarios', 'GestionUsuariosScreen.tsx'), {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useCallback: (callback) => callback, useState: (initial) => [initial, () => {}] },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', FlatList: 'FlatList', Pressable: 'Pressable', Text: 'Text', View: 'View',
    },
    'expo-router': {
      Redirect: 'Redirect',
      router: { back: () => {}, push: (route) => navigations.push(route) },
      useFocusEffect: (callback) => { focus = callback; },
    },
    '@/presentation/navigation/roleRoutes': { routeForRole: () => '/veedor' },
    '@/presentation/navigation/volverSeguro': { volverSeguro: (route) => navigations.push(route) },
    '@/presentation/store': {
      useAppSelector: (selector) => selector({ auth: { perfil, inicializando: false } }),
      useAppDispatch: () => (action) => {
        actions.push(action);
        return { unwrap: () => Promise.resolve([]) };
      },
    },
    '@/presentation/store/slices/territorioSlice': {
      cargarCoordinadoresRecinto: () => 'coordinadores',
      cargarVeedoresDisponibles: () => 'veedores',
    },
  });
  return { render: screen.GestionUsuariosScreen, actions, navigations, focus: () => focus() };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

test('the usuarios route renders the management screen', () => {
  const GestionUsuariosScreen = () => null;
  const route = loadModule(path.join('app', 'usuarios.tsx'), {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '@/presentation/screens/usuarios/GestionUsuariosScreen': { GestionUsuariosScreen },
  });
  assert.equal(route.default().type, GestionUsuariosScreen);
});

for (const [rol, expected] of [
  ['COORDINADOR_PROVINCIAL', 'coordinadores'],
  ['COORDINADOR_RECINTO', 'veedores'],
]) {
  test(`${rol} loads its team and opens the existing registration route`, () => {
    const component = setup({ rol, mustChangePassword: false });
    const tree = component.render();
    component.focus();
    assert.deepEqual(component.actions, [expected]);
    const button = find(tree, (node) => node.type === 'Pressable' && node.props.children?.props?.children?.startsWith('Registrar'));
    assert.ok(button);
    button.props.onPress();
    assert.deepEqual(component.navigations, ['/(auth)/register-subordinate']);
    const back = find(tree, (node) => node.type === 'Pressable' && node.props.children?.props?.children === '← Volver');
    back.props.onPress();
    assert.deepEqual(component.navigations, ['/(auth)/register-subordinate', '/ajustes']);
  });
}

test('unauthorized and password-change users cannot load team members', () => {
  for (const [perfil, destination] of [
    [null, '/(auth)/login'],
    [{ rol: 'VEEDOR', mustChangePassword: false }, '/veedor'],
    [{ rol: 'COORDINADOR_RECINTO', mustChangePassword: true }, '/(auth)/change-password'],
  ]) {
    const component = setup(perfil);
    const tree = component.render();
    component.focus();
    assert.equal(tree.type, 'Redirect');
    assert.equal(tree.props.href, destination);
    assert.deepEqual(component.actions, []);
  }
});
