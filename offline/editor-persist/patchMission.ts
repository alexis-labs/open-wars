import { decodeEffects, type Effects } from '@deities/apollo/Effects.tsx';
import MapData from '@deities/athena/MapData.tsx';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, SyntaxKind } from 'ts-morph';

function getRepoRoot(): string {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  if (existsSync(join(repoRoot, 'tsconfig.json'))) {
    return repoRoot;
  }

  const cwd = process.cwd();
  if (existsSync(join(cwd, 'editor-persist', 'patchMission.ts'))) {
    return join(cwd, '..');
  }

  return repoRoot;
}

const repoRoot = getRepoRoot();
import { generateEffectsCode } from './generateEffects.ts';
import { generateMapConfig } from './generateMapConfig.ts';
import { resolveMissionRegistryEntry, type MissionRegistryEntry } from './registry.ts';
import { buildingIdToSymbol, unitIdToSymbol } from './symbolMaps.ts';

const buildingSymbolNames = new Set(buildingIdToSymbol.values());
const unitSymbolNames = new Set(unitIdToSymbol.values());

function getSharedModuleSpecifier(entry: MissionRegistryEntry) {
  return entry.act === 'tutorial' ? './shared.tsx' : '../tutorial/shared.tsx';
}

function collectIdSymbols(code: string) {
  const symbols = new Set<string>();
  for (const match of code.matchAll(/\b([A-Z][A-Za-z0-9]*)\.id\b/g)) {
    symbols.add(match[1]!);
  }
  return symbols;
}

function ensureCodegenSymbolImports(
  sourceFile: import('ts-morph').SourceFile,
  code: string,
  entry: MissionRegistryEntry,
) {
  const sharedModule = getSharedModuleSpecifier(entry);

  for (const symbol of collectIdSymbols(code)) {
    if (buildingSymbolNames.has(symbol)) {
      ensureNamedImport(sourceFile, sharedModule, symbol);
      continue;
    }

    if (!unitSymbolNames.has(symbol)) {
      continue;
    }

    const unitImport = sourceFile.getImportDeclaration((declaration) =>
      declaration.getModuleSpecifierValue().includes('Unit.tsx'),
    );

    if (unitImport) {
      if (
        !unitImport
          .getNamedImports()
          .some((specifier) => specifier.getName() === symbol)
      ) {
        unitImport.addNamedImport(symbol);
      }
      continue;
    }

    ensureNamedImport(sourceFile, sharedModule, symbol);
  }
}

export type PersistEditorMapInput = Readonly<{
  effects: string;
  id: string;
  mapName: string;
  state: string;
}>;

function formatMapNameLiteral(mapName: string): string {
  return JSON.stringify(mapName);
}

function ensureNamedImport(
  sourceFile: import('ts-morph').SourceFile,
  moduleSpecifier: string,
  namedImport: string,
) {
  const hasImport = sourceFile
    .getImportDeclarations()
    .some((declaration) =>
      declaration.getModuleSpecifierValue().includes(moduleSpecifier) &&
      declaration.getNamedImports().some((specifier) => specifier.getName() === namedImport),
    );

  if (hasImport) {
    return;
  }

  const existingImport = sourceFile.getImportDeclaration((declaration) =>
    declaration.getModuleSpecifierValue().includes(moduleSpecifier),
  );

  if (existingImport) {
    existingImport.addNamedImport(namedImport);
    return;
  }

  sourceFile.addImportDeclaration({
    moduleSpecifier,
    namedImports: [namedImport],
  });
}

function ensureEffectsFromEncodedImport(sourceFile: import('ts-morph').SourceFile) {
  const hasImport = sourceFile
    .getImportDeclarations()
    .some(
      (declaration) =>
        declaration.getNamedImports().some((specifier) => specifier.getName() === 'effectsFromEncoded'),
    );

  if (hasImport) {
    return;
  }

  const tutorialImport = sourceFile.getImportDeclaration((declaration) =>
    declaration.getModuleSpecifierValue().includes('tutorial/shared'),
  );

  if (tutorialImport) {
    tutorialImport.addNamedImport('effectsFromEncoded');
    return;
  }

  sourceFile.addImportDeclaration({
    moduleSpecifier: '../tutorial/shared.tsx',
    namedImports: ['effectsFromEncoded'],
  });
}

function replaceObjectProperty(
  objectLiteral: import('ts-morph').ObjectLiteralExpression,
  name: string,
  initializer: string,
) {
  const property = objectLiteral.getProperty(name);
  if (property?.isKind(SyntaxKind.PropertyAssignment)) {
    property.getInitializer()?.replaceWithText(initializer);
    return;
  }

  objectLiteral.addPropertyAssignment({
    initializer,
    name,
  });
}

export function patchMissionFile(
  entry: MissionRegistryEntry,
  map: MapData,
  effects: Effects,
  mapName: string,
): void {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    tsConfigFilePath: join(repoRoot, 'tsconfig.json'),
  });

  const sourceFile = project.addSourceFileAtPath(entry.missionsFile);
  const missionVariable = sourceFile.getVariableDeclaration(entry.missionVariable);
  if (!missionVariable) {
    throw new Error(`Could not find mission variable '${entry.missionVariable}'.`);
  }

  const initializer = missionVariable.getInitializer();
  if (!initializer?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    throw new Error(`Mission '${entry.missionVariable}' does not use an object literal initializer.`);
  }

  const effectsCode = generateEffectsCode(effects);
  if (effectsCode.includes('effectsFromEncoded')) {
    ensureEffectsFromEncodedImport(sourceFile);
  }

  const mapConfigCode = generateMapConfig(map, entry);
  const codegenBundle = `${mapConfigCode}\n${effectsCode}`;

  ensureCodegenSymbolImports(sourceFile, codegenBundle, entry);

  if (mapConfigCode.includes(`${entry.tilesNamespace}.`)) {
    ensureNamedImport(sourceFile, getSharedModuleSpecifier(entry), entry.tilesNamespace);
  }

  replaceObjectProperty(initializer, 'map', mapConfigCode);
  replaceObjectProperty(initializer, 'effects', effectsCode);
  replaceObjectProperty(initializer, 'mapName', formatMapNameLiteral(mapName));

  sourceFile.saveSync();

  formatMissionFile(entry.missionsFile);
}

function formatMissionFile(missionsFile: string) {
  const oxfmtCommand = process.platform === 'win32' ? 'oxfmt.cmd' : 'oxfmt';
  const oxfmtPath = join(repoRoot, 'node_modules', '.bin', oxfmtCommand);

  const formatResult = existsSync(oxfmtPath)
    ? spawnSync(oxfmtPath, ['--write', missionsFile], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      })
    : spawnSync('pnpm', ['oxfmt', '--write', missionsFile], {
        cwd: repoRoot,
        encoding: 'utf8',
        shell: process.platform === 'win32',
        stdio: 'pipe',
      });

  if (formatResult.status !== 0) {
    // Mission source is already written; formatting is best-effort.
    console.warn(
      '[open-wars] oxfmt failed:',
      formatResult.stderr?.toString() || formatResult.stdout?.toString() || 'unknown error',
    );
  }
}

export function persistEditorMapToProject(input: PersistEditorMapInput): void {
  const entry = resolveMissionRegistryEntry(input.id, input.mapName);
  if (!entry) {
    throw new Error(
      `Map '${input.id}' is not linked to a campaign mission in offline/*/missions.tsx.`,
    );
  }

  const map = MapData.fromJSON(input.state);
  if (!map) {
    throw new Error('Invalid map state.');
  }

  let effects: Effects;
  try {
    effects = input.effects ? decodeEffects(JSON.parse(input.effects)) : new Map();
  } catch {
    throw new Error('Invalid effects payload.');
  }

  patchMissionFile(entry, map, effects, input.mapName);
}
