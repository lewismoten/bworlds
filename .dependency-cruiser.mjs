import noCircular from './node_modules/dependency-cruiser/configs/rules/no-circular.cjs';
import noDeprecatedCore from './node_modules/dependency-cruiser/configs/rules/no-deprecated-core.cjs';
import noDuplicateDependencyTypes from './node_modules/dependency-cruiser/configs/rules/no-duplicate-dependency-types.cjs';
import noNonPackageJson from './node_modules/dependency-cruiser/configs/rules/no-non-package-json.cjs';
import notToDeprecated from './node_modules/dependency-cruiser/configs/rules/not-to-deprecated.cjs';
import notToUnresolvable from './node_modules/dependency-cruiser/configs/rules/not-to-unresolvable.cjs';

const NO_ORPHAN_PATH_NOT = [
  '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
  '\\.d\\.(c|m)?ts$',
  '(^|/)tsconfig\\.json$',
  '(^|/)(?:babel|webpack)\\.config\\.(?:js|cjs|mjs|ts|json)$',
  '[.](?:spec|test)\\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$',
  '^packages/plugin-api/src/types\\.ts$',
  '^apps/web/src/test-setup\\.ts$',
  '^apps/landing/index\\.js$',
];

const noOrphans = {
  name: 'no-orphans',
  comment:
    "This is an orphan module - it's likely not used (anymore?). Either use it or remove it, or add an exception here when it's an intentional standalone module.",
  severity: 'warn',
  from: {
    orphan: true,
    pathNot: NO_ORPHAN_PATH_NOT,
  },
  to: {},
};

/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  forbidden: [
    noOrphans,
    noCircular,
    noDeprecatedCore,
    noDuplicateDependencyTypes,
    noNonPackageJson,
    notToDeprecated,
    notToUnresolvable,
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: [
        'npm',
        'npm-dev',
        'npm-optional',
        'npm-peer',
        'npm-bundled',
        'npm-no-pkg',
      ],
    },
    combinedDependencies: true,
    includeOnly: ['^(apps|packages)/'],
    exclude: {
      path: ['(^|/)dist/', '[.]d[.]ts$'],
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
      mainFields: ['exports', 'module', 'main', 'types'],
    },
  },
};

export default config;
