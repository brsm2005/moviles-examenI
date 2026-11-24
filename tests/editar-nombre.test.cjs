/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function load(relativePath, dependencies) {
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

const zod = require('zod');
const perfilSchema = load(path.join('src', 'domain', 'schemas', 'perfilSchema.ts'), { zod });
const usuariosSchemas = load(path.join('src', 'domain', 'schemas', 'usuariosSchemas.ts'), {
  zod, './perfilSchema': perfilSchema,
});
const authSchemas = load(path.join('src', 'domain', 'schemas', 'authSchemas.ts'), {
  zod, './perfilSchema': perfilSchema,
});

test('name validation trims the value and rejects blank or invalid names', () => {
  assert.equal(usuariosSchemas.editarNombreSchema.parse({ nuevoNombre: '  María Pérez  ' }).nuevoNombre, 'María Pérez');
  assert.equal(usuariosSchemas.editarNombreSchema.safeParse({ nuevoNombre: '   ' }).success, false);
  assert.equal(usuariosSchemas.editarNombreSchema.safeParse({ nuevoNombre: '12345' }).success, false);
});

function createAuth() {
  let cached = null;
  let connected = true;
  let sessionId = 'c3e503fc-6cc0-4233-939f-e3312f6d808c';
  let failure = null;
  let nextSessionId = null;
  const calls = [];
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: sessionId, email: 'test@example.com', email_confirmed_at: '2026' } } }, error: null }) },
    from: (table) => {
      assert.equal(table, 'perfiles');
      return { select: () => ({ eq: () => ({ single: async () => ({
        data: { id: sessionId, cedula: '0102030405', nombres_completos: 'Nombre anterior', telefono: '0912345678', rol: 'VEEDOR', must_change_password: false, activo: true },
        error: null,
      }) }) }) };
    },
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (failure) return { data: null, error: failure };
      if (nextSessionId) sessionId = nextSessionId;
      return { data: args.p_nombres_completos.trim(), error: null };
    },
  };
  const secure = {
    getItemAsync: async () => cached,
    setItemAsync: async (_, value) => { cached = value; },
    deleteItemAsync: async () => { cached = null; },
  };
  const { SupabaseAuthRepository } = load(path.join('src', 'infrastructure', 'supabase', 'SupabaseAuthRepository.ts'), {
    '@react-native-community/netinfo': { __esModule: true, default: { fetch: async () => ({ isConnected: connected }) } },
    'expo-secure-store': secure,
    zod,
    '@/domain/schemas/authSchemas': authSchemas,
    './client': { supabase },
  });
  return {
    repo: new SupabaseAuthRepository(), calls,
    cache: () => JSON.parse(cached),
    fail: (error) => { failure = error; },
    changeSessionDuringSave: (id) => { nextSessionId = id; },
    offline: () => { connected = false; },
  };
}

test('updates the authenticated profile through the restricted RPC and refreshes the offline cache', async () => {
  const { repo, calls, cache, offline } = createAuth();
  const perfil = await repo.actualizarNombrePropio('María Pérez');
  assert.equal(perfil.nombresCompletos, 'María Pérez');
  assert.deepEqual(calls, [{
    name: 'actualizar_nombre_propio',
    args: { p_perfil_id: perfil.id, p_nombres_completos: 'María Pérez' },
  }]);
  assert.equal(cache().nombresCompletos, 'María Pérez');
  offline();
  assert.equal((await repo.obtenerPerfilActual()).nombresCompletos, 'María Pérez');
});

test('a session change during save does not cache or return another user profile', async () => {
  const { repo, cache, changeSessionDuringSave } = createAuth();
  changeSessionDuringSave('d7a29a4f-1cc6-4b9d-a1c3-52116599f808');
  await assert.rejects(repo.actualizarNombrePropio('María Pérez'), /sesión cambió/);
  assert.equal(cache().nombresCompletos, 'Nombre anterior');
});

test('failed update is reported and does not put the new name in the cache', async () => {
  const { repo, cache, fail } = createAuth();
  fail(new Error('Sin conexión'));
  await assert.rejects(repo.actualizarNombrePropio('María Pérez'), /Sin conexión/);
  assert.equal(cache().nombresCompletos, 'Nombre anterior');
});
