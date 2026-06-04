import { type CharacterMessageEffectAction } from '@deities/apollo/Action.tsx';
import { encodeEffects, type Effects } from '@deities/apollo/Effects.tsx';
import { unitIdToSymbol } from './symbolMaps.ts';

const MSG_UNITS = new Set([
  'Pioneer',
  'Infantry',
  'Jeep',
  'Artillery',
  'ArtilleryHumvee',
  'Medic',
  'Sniper',
  'Saboteur',
]);

function isCharacterMessage(
  action: { type: string },
): action is CharacterMessageEffectAction {
  return action.type === 'CharacterMessageEffect';
}

function formatMsg(action: CharacterMessageEffectAction): string | null {
  const symbol = unitIdToSymbol.get(action.unitId);
  if (!symbol || !MSG_UNITS.has(symbol)) {
    return null;
  }
  const variant = action.variant ?? 0;
  const message = JSON.stringify(action.message);
  if (variant === 0 && !action.silhouette) {
    return `msg(${symbol}, ${message})`;
  }
  return `msg(${symbol}, ${message}, ${variant})`;
}

function extractMessages(
  effects: Effects,
  trigger: 'Start' | 'GameEnd',
  gameEndValue?: 'win' | 'lose',
): ReadonlyArray<string> | null {
  const set = effects.get(trigger);
  if (!set) {
    return trigger === 'Start' ? [] : [];
  }

  const messages: Array<string> = [];
  for (const effect of set) {
    if (trigger === 'GameEnd') {
      const condition = effect.conditions?.[0];
      if (
        !condition ||
        condition.type !== 'GameEnd' ||
        (gameEndValue && condition.value !== gameEndValue)
      ) {
        continue;
      }
    } else if (effect.conditions?.length) {
      continue;
    }

    for (const action of effect.actions) {
      if (!isCharacterMessage(action)) {
        return null;
      }
      const line = formatMsg(action);
      if (!line) {
        return null;
      }
      messages.push(line);
    }
  }

  return messages;
}

function hasOnlySupportedEffects(effects: Effects): boolean {
  for (const [trigger, set] of effects) {
    if (trigger !== 'Start' && trigger !== 'GameEnd') {
      return false;
    }
    for (const effect of set) {
      for (const action of effect.actions) {
        if (!isCharacterMessage(action)) {
          return false;
        }
      }
    }
  }
  return true;
}

function formatMessageList(messages: ReadonlyArray<string>): string {
  if (!messages.length) {
    return '[]';
  }
  if (messages.length === 1) {
    return `[\n      ${messages[0]},\n    ]`;
  }
  return `[\n      ${messages.join(',\n      ')},\n    ]`;
}

export function generateEffectsCode(effects: Effects): string {
  if (!hasOnlySupportedEffects(effects)) {
    const encoded = JSON.stringify(encodeEffects(effects));
    return `effectsFromEncoded(${encoded})`;
  }

  const start = extractMessages(effects, 'Start') ?? [];
  const win = extractMessages(effects, 'GameEnd', 'win') ?? [];
  const lose = extractMessages(effects, 'GameEnd', 'lose') ?? [];

  if (start === null || win === null || lose === null) {
    const encoded = JSON.stringify(encodeEffects(effects));
    return `effectsFromEncoded(${encoded})`;
  }

  return `createTutorialEffects(
    ${formatMessageList(start)},
    ${formatMessageList(win)},
    ${formatMessageList(lose)},
  )`;
}
