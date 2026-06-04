import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';

const savePath = '/__open-wars/editor/save-map';
const persistModuleId = '/editor-persist/patchMission.ts';

function getRepoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'editor-persist', 'patchMission.ts'))) {
    return join(cwd, '..');
  }
  if (existsSync(join(cwd, 'offline', 'editor-persist', 'patchMission.ts'))) {
    return cwd;
  }

  const fromPlugin = join(fileURLToPath(new URL('.', import.meta.url)), '..');
  if (existsSync(join(fromPlugin, 'offline', 'editor-persist', 'patchMission.ts'))) {
    return fromPlugin;
  }

  return join(cwd, '..');
}

type PersistModule = typeof import('../offline/editor-persist/patchMission.ts');

export default function offlineEditorSavePlugin(): Plugin {
  let persistModule: PersistModule | null = null;

  return {
    name: 'open-wars-offline-editor-save',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith(savePath) || request.method !== 'POST') {
          next();
          return;
        }

        try {
          const body = await readBody(request);
          const payload = JSON.parse(body) as {
            effects?: string;
            id?: string;
            mapName?: string;
            state?: string;
          };

          if (!payload.id || !payload.state || !payload.mapName) {
            sendJson(response, 400, { error: 'Missing id, state, or mapName.' });
            return;
          }

          const persistPayload = {
            effects: payload.effects || '',
            id: payload.id,
            mapName: payload.mapName,
            state: payload.state,
          };

          if (process.platform === 'win32') {
            runPersistCli(getRepoRoot(), persistPayload);
          } else {
            try {
              if (!persistModule) {
                persistModule = (await server.ssrLoadModule(
                  persistModuleId,
                )) as PersistModule;
              }
              persistModule.persistEditorMapToProject(persistPayload);
            } catch (loadError) {
              runPersistCli(getRepoRoot(), persistPayload, loadError);
            }
          }

          sendJson(response, 200, { ok: true });
        } catch (error) {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : 'Save failed.',
          });
        }
      });
    },
  };
}

function readBody(request: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Array<Buffer> = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function sendJson(
  response: import('node:http').ServerResponse,
  status: number,
  payload: Record<string, unknown>,
) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

function runPersistCli(
  repoRoot: string,
  payload: Parameters<PersistModule['persistEditorMapToProject']>[0],
  loadError?: unknown,
) {
  const cliPath = join(repoRoot, 'offline', 'editor-persist', 'save-map-cli.ts');
  const nodeOptions = process.env.NODE_OPTIONS || '';
  const loaderArgs = nodeOptions.includes('ts-node/esm')
    ? []
    : ['--no-warnings', '--experimental-specifier-resolution=node', '--loader', 'ts-node/esm'];

  const result = spawnSync(process.execPath, [...loaderArgs, cliPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: JSON.stringify(payload),
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const cliError = result.stderr?.trim() || result.stdout?.trim();
    const hint =
      loadError instanceof Error ? loadError.message : String(loadError);
    throw new Error(cliError || hint || 'Save to project failed.');
  }
}
