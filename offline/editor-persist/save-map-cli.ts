import { readFileSync } from 'node:fs';
import { persistEditorMapToProject } from './patchMission.ts';

const input = readFileSync(0, 'utf8');

try {
  const payload = JSON.parse(input) as Parameters<typeof persistEditorMapToProject>[0];
  persistEditorMapToProject(payload);
  process.stdout.write(JSON.stringify({ ok: true }));
} catch (error) {
  const message = error instanceof Error ? error.message : 'Save failed.';
  process.stderr.write(message);
  process.exit(1);
}
