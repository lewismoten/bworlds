import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEST_SOURCE_AUDIT_DISABLE_FILE = 'test-source-audit-disable-file';
export const TEST_SOURCE_AUDIT_DISABLE_NEXT_LINE =
  'test-source-audit-disable-next-line';
export const TEST_SOURCE_AUDIT_MAX_STATIC_COLLECTION_SIZE = 5_000;

const TEST_FILE_NAME_PATTERN = /\.test\.[cm]?[jt]sx?$/;
const IGNORED_DIRECTORY_NAMES = new Set([
  '.git',
  'coverage',
  'dist',
  'dist-analyze',
  'dist-analyze2',
  'node_modules',
]);
const REPOSITORY_TEST_ROOTS = ['apps/web/src', 'packages'] as const;

export type TestSourceAuditFindingCode =
  'unbounded-loop' | 'oversized-static-collection';

export type TestSourceAuditFinding = {
  filePath: string;
  line: number;
  column: number;
  code: TestSourceAuditFindingCode;
  message: string;
};

type StaticCollectionPattern = {
  code: 'oversized-static-collection';
  regex: RegExp;
  describe: (size: number) => string;
};

const STATIC_COLLECTION_PATTERNS: readonly StaticCollectionPattern[] = [
  {
    code: 'oversized-static-collection',
    regex: /Array\.from\(\s*\{\s*length:\s*(\d[\d_]*)\s*\}/g,
    describe: (size) =>
      `Avoid Array.from({ length: ${size} }) in test sources; keep static fixtures under ${TEST_SOURCE_AUDIT_MAX_STATIC_COLLECTION_SIZE} items or build them incrementally.`,
  },
  {
    code: 'oversized-static-collection',
    regex: /new\s+Array\(\s*(\d[\d_]*)\s*\)/g,
    describe: (size) =>
      `Avoid new Array(${size}) in test sources; keep static fixtures under ${TEST_SOURCE_AUDIT_MAX_STATIC_COLLECTION_SIZE} items or build them incrementally.`,
  },
  {
    code: 'oversized-static-collection',
    regex: /\.repeat\(\s*(\d[\d_]*)\s*\)/g,
    describe: (size) =>
      `Avoid repeat(${size}) in test sources when it builds large static fixtures; keep them under ${TEST_SOURCE_AUDIT_MAX_STATIC_COLLECTION_SIZE} items or bytes.`,
  },
];

export function findSuspiciousTestSourcePatterns(
  sourceText: string,
  filePath: string
): TestSourceAuditFinding[] {
  if (sourceText.includes(TEST_SOURCE_AUDIT_DISABLE_FILE)) {
    return [];
  }

  const lines = sourceText.split(/\r?\n/);
  const findings: TestSourceAuditFinding[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const previousLine = lines[index - 1] ?? '';
    if (
      line.includes(TEST_SOURCE_AUDIT_DISABLE_NEXT_LINE) ||
      previousLine.includes(TEST_SOURCE_AUDIT_DISABLE_NEXT_LINE)
    ) {
      continue;
    }

    const unboundedLoopMatch = line.match(
      /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/
    );
    if (unboundedLoopMatch) {
      findings.push({
        filePath,
        line: index + 1,
        column: (unboundedLoopMatch.index ?? 0) + 1,
        code: 'unbounded-loop',
        message:
          'Avoid unconditional infinite loops in test sources. Add an exit condition or annotate the next line when the loop is intentional.',
      });
    }

    for (const pattern of STATIC_COLLECTION_PATTERNS) {
      for (const match of line.matchAll(pattern.regex)) {
        const literal = match[1];
        if (!literal) {
          continue;
        }
        const size = Number(literal.replaceAll('_', ''));
        if (
          !Number.isFinite(size) ||
          size <= TEST_SOURCE_AUDIT_MAX_STATIC_COLLECTION_SIZE
        ) {
          continue;
        }
        findings.push({
          filePath,
          line: index + 1,
          column: (match.index ?? 0) + 1,
          code: pattern.code,
          message: pattern.describe(size),
        });
      }
    }
  }

  return findings;
}

export async function auditRepositoryTestSources(
  repositoryRoot = resolveRepositoryRoot()
): Promise<TestSourceAuditFinding[]> {
  const findings: TestSourceAuditFinding[] = [];

  for (const root of REPOSITORY_TEST_ROOTS) {
    const absoluteRoot = path.join(repositoryRoot, root);
    const filePaths = await collectTestSourceFiles(absoluteRoot);
    for (const absolutePath of filePaths) {
      const sourceText = await readFile(absolutePath, 'utf8');
      const relativePath = path.relative(repositoryRoot, absolutePath);
      findings.push(
        ...findSuspiciousTestSourcePatterns(sourceText, relativePath)
      );
    }
  }

  return findings.sort((left, right) =>
    `${left.filePath}:${left.line}:${left.column}`.localeCompare(
      `${right.filePath}:${right.line}:${right.column}`
    )
  );
}

async function collectTestSourceFiles(
  directoryPath: string
): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of entries) {
    if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
      continue;
    }
    const absolutePath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...(await collectTestSourceFiles(absolutePath)));
      continue;
    }
    if (entry.isFile() && TEST_FILE_NAME_PATTERN.test(entry.name)) {
      filePaths.push(absolutePath);
    }
  }

  return filePaths.sort((left, right) => left.localeCompare(right));
}

function resolveRepositoryRoot(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    '..'
  );
}
