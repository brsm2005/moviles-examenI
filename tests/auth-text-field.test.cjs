/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'presentation', 'components', 'auth', 'AuthTextField.tsx'),
  'utf8',
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function createField() {
  let visible = false;
  const SymbolView = () => null;
  const components = { Pressable: 'Pressable', Text: 'Text', TextInput: 'TextInput', View: 'View' };
  const jsx = (type, props) => {
    assert.ok(type, 'Component must be defined');
    return { type, props };
  };
  const requireMock = (name) => {
    if (name === 'react') {
      return { useState: () => [visible, (update) => { visible = update(visible); }] };
    }
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native') return components;
    if (name === 'expo-symbols') return { SymbolView };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', javascript)(requireMock, module, module.exports);
  return { render: module.exports.AuthTextField, SymbolView };
}

test('password visibility toggle renders supported symbols and changes secure entry', () => {
  const { render, SymbolView } = createField();
  const props = { label: 'Contraseña', secureTextEntry: true, showPasswordToggle: true };
  const getControls = () => {
    const tree = render(props);
    const container = tree.props.children[1];
    return { input: container.props.children[0], button: container.props.children[1] };
  };

  let { input, button } = getControls();
  assert.equal(input.props.secureTextEntry, true);
  assert.equal(button.props.accessibilityLabel, 'Mostrar contraseña');
  assert.equal(button.props.children.type, SymbolView);
  assert.equal(button.props.children.props.name.android, 'visibility_off');
  button.props.onPress();

  ({ input, button } = getControls());
  assert.equal(input.props.secureTextEntry, false);
  assert.equal(button.props.accessibilityLabel, 'Ocultar contraseña');
  assert.equal(button.props.children.props.name.android, 'visibility');
  button.props.onPress();
  assert.equal(getControls().input.props.secureTextEntry, true);
});

test('fields without password toggle retain their secure entry setting', () => {
  const { render } = createField();
  const tree = render({ label: 'Contraseña', secureTextEntry: true });
  const [input, button] = tree.props.children[1].props.children;
  assert.equal(input.props.secureTextEntry, true);
  assert.equal(button, null);
});
