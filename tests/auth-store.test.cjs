/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadModule(relativePath, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name in dependencies) return dependencies[name];
    if (name === '@reduxjs/toolkit') return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  };
  new Function('require', 'module', 'exports', javascript)(requireMock, module, module.exports);
  return module.exports;
}

test('store initializes personal state and dispatches sign-in with its repository', async () => {
  const auth = loadModule(path.join('src', 'presentation', 'store', 'slices', 'authSlice.ts'), {});
  const personal = loadModule(path.join('src', 'presentation', 'store', 'slices', 'personalSlice.ts'), {});
  const emptyReducer = (state = {}) => state;
  const storeModule = loadModule(path.join('src', 'presentation', 'store', 'index.ts'), {
    'react-redux': { useDispatch: { withTypes: () => () => {} }, useSelector: () => {} },
    './slices/authSlice': auth,
    './slices/personalSlice': personal,
    './slices/actaSlice': { actaReducer: emptyReducer },
    './slices/territorioSlice': { territorioReducer: emptyReducer },
    './slices/historialSlice': { historialReducer: emptyReducer },
    './slices/monitoreoSlice': { monitoreoReducer: emptyReducer },
    './slices/usuariosSlice': { default: emptyReducer },
  });
  const credentials = { email: 'test@example.com', password: 'password' };
  const profile = { id: 'user-id' };
  const authRepository = {
    iniciarSesion: async (received) => {
      assert.deepEqual(received, credentials);
      return profile;
    },
  };
  const store = storeModule.createAppStore(authRepository, {}, {}, {}, {}, {}, {});

  assert.deepEqual(store.getState().personal.subordinados, []);
  assert.deepEqual(await store.dispatch(auth.signIn(credentials)).unwrap(), profile);
  assert.deepEqual(store.getState().auth.perfil, profile);
});

test('updating the current name refreshes auth state and leaves it unchanged on failure', async () => {
  const auth = loadModule(path.join('src', 'presentation', 'store', 'slices', 'authSlice.ts'), {});
  const { configureStore } = require('@reduxjs/toolkit');
  const profile = { id: 'user-id', nombresCompletos: 'Nombre anterior' };
  let shouldFail = false;
  const reports = [];
  const authRepository = {
    iniciarSesion: async () => profile,
    actualizarNombrePropio: async (name) => {
      if (shouldFail) throw new Error('Sin conexión');
      return { ...profile, nombresCompletos: name };
    },
  };
  const store = configureStore({
    reducer: { auth: auth.authReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      thunk: { extraArgument: { authRepository, crashReportingService: {
        registrarError: async (error, context) => reports.push({ error, context }),
      } } },
    }),
  });
  await store.dispatch(auth.signIn({})).unwrap();
  await store.dispatch(auth.actualizarNombrePropio('Nombre nuevo')).unwrap();
  assert.equal(store.getState().auth.perfil.nombresCompletos, 'Nombre nuevo');
  shouldFail = true;
  await assert.rejects(store.dispatch(auth.actualizarNombrePropio('Otro nombre')).unwrap(), (error) => error === 'Sin conexión');
  assert.equal(store.getState().auth.perfil.nombresCompletos, 'Nombre nuevo');
  assert.equal(reports[0].context.operacion, 'actualizar_nombre_propio');
});
