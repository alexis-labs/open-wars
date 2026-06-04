import type { Plugin, ViteDevServer } from 'vite';
import root from './root.ts';

const savePath = '/__open-wars/editor/save-map';

export default function offlineEditorSavePlugin(): Plugin {
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

          const { persistEditorMapToProject } = await import(
            `${root}/offline/editor-persist/patchMission.ts`
          );

          persistEditorMapToProject({
            effects: payload.effects || '',
            id: payload.id,
            mapName: payload.mapName,
            state: payload.state,
          });

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
