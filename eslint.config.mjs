// Lint for the engine. The browser loads themes → classes → a pack → the engine as plain scripts sharing one global
// scope, so tools/test.sh lints each built combination as a single file (dist/lint/<pack>.js) to catch undefined names.
import globals from 'globals';
export default [{
  files: ['dist/lint/*.js', 'web/*.js', 'tools/**/*.js'],
  ignores: ['web/pocketbase.umd.js', 'web/three.min.js'],   // vendored libraries
  languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.browser, ...globals.node, PocketBase: 'readonly', THREE: 'readonly' } },
  rules: {
    'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-duplicate-case': 'error',
    'no-dupe-else-if': 'error', 'no-self-assign': 'error', 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }], eqeqeq: ['error', 'smart']
  }
},
// tests: code inside page.evaluate(() => …) runs in the sheet and uses its globals (S, D, cur…)
{ files: ['tools/**/*.js'], rules: { 'no-undef': 'off' } }];
