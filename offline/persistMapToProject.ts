import { type MapObject } from '@deities/hera/editor/Types.tsx';
import { isOfficialEditorMapId } from './editor-persist/officialMapIds.ts';

export async function persistMapToProject(
  mapObject: MapObject,
): Promise<{ error?: string; ok: boolean }> {
  if (!import.meta.env.DEV) {
    return { error: 'Project save only works in dev mode.', ok: false };
  }

  if (!isOfficialEditorMapId(mapObject.id)) {
    return {
      error: 'Only official campaign maps can be saved to the project.',
      ok: false,
    };
  }

  try {
    const response = await fetch('/__open-wars/editor/save-map', {
      body: JSON.stringify({
        effects: mapObject.effects,
        id: mapObject.id,
        mapName: mapObject.name,
        state: mapObject.state,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const data = (await response.json()) as { error?: string; ok?: boolean };
    if (!response.ok) {
      return { error: data.error || 'Save to project failed.', ok: false };
    }

    return { ok: true };
  } catch {
    return {
      error: 'Could not reach the dev server. Run: pnpm --dir offline dev',
      ok: false,
    };
  }
}
