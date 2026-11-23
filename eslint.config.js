const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'android/*', 'ios/*'],
  },
  {
    plugins: {
      boundaries,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/*' },
        { type: 'data', pattern: 'src/data/*' },
        { type: 'infrastructure', pattern: 'src/infrastructure/*' },
        { type: 'presentation', pattern: 'src/presentation/*' },
        { type: 'app', pattern: 'app/*' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: ['domain'], allow: ['domain'] },
            { from: ['data'], allow: ['domain', 'data'] },
            { from: ['infrastructure'], allow: ['domain', 'infrastructure'] },
            { from: ['presentation'], allow: ['domain', 'presentation'] },
            { from: ['app'], allow: ['domain', 'data', 'infrastructure', 'presentation', 'app'] },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts', 'src/domain/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react-native',
                'expo-*',
                '@supabase/*',
                '@google/generative-ai',
                '@reduxjs/toolkit',
                'react-redux',
                '@react-native-firebase/*',
                'uniwind',
              ],
              message:
                'Violación de Clean Architecture: src/domain/ debe permanecer puro y sin dependencias externas.',
            },
          ],
        },
      ],
    },
  },
]);
