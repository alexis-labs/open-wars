import CharacterMessage from '@deities/apollo/CharacterMessage.tsx';
import { type Effects } from '@deities/apollo/Effects.tsx';
import { Pioneer } from '@deities/athena/info/Unit.tsx';
import { describe, expect, test } from 'vitest';
import { act1Missions } from '../../offline/act1/missions.tsx';
import { generateEffectsCode } from '../../offline/editor-persist/generateEffects.ts';
import { generateMapConfig } from '../../offline/editor-persist/generateMapConfig.ts';
import { getMissionRegistryEntry } from '../../offline/editor-persist/registry.ts';
import { createTutorialEffects } from '../../offline/tutorial/shared.tsx';

describe('editor persist codegen', () => {
  test('registry resolves act 1 mission 1', () => {
    const entry = getMissionRegistryEntry('local-map-act1-1');
    expect(entry?.missionVariable).toBe('mission1');
    expect(entry?.buildMapCall).toBe('buildTutorialMap');
  });

  test('generateMapConfig emits buildTutorialMap for act 1 mission 1', () => {
    const mission = act1Missions[0];
    const entry = getMissionRegistryEntry(mission.id);
    expect(entry).toBeTruthy();
    const code = generateMapConfig(mission.map, entry!);
    expect(code).toContain('buildTutorialMap({');
    expect(code).toContain('act1StandardTerrain');
    expect(code).toContain('standardTeams()');
  });

  test('generateEffectsCode emits createTutorialEffects for tutorial messages', () => {
    const effects = createTutorialEffects(
      [CharacterMessage(Pioneer, 'Hello', 'self', 0)],
      [CharacterMessage(Pioneer, 'Win', 'self', 0)],
      [CharacterMessage(Pioneer, 'Lose', 'self', 1)],
    );
    const code = generateEffectsCode(effects);
    expect(code).toContain('createTutorialEffects');
    expect(code).toContain('msg(Pioneer');
  });

  test('generateEffectsCode uses effectsFromEncoded when actions are not character messages', () => {
    const code = generateEffectsCode(
      new Map([
        [
          'Start',
          new Set([
            {
              actions: [
                {
                  type: 'SpawnEffect',
                  units: [],
                },
              ],
            },
          ]),
        ],
      ]) as Effects,
    );
    expect(code).toContain('effectsFromEncoded');
  });
});
