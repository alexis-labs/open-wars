const spriteOverridePrefix = '::OpenWars::sprite-override::';

export const spriteOverridesChangedEvent = 'open-wars:sprite-overrides-changed';

const getStorage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const getKey = (name: string) => `${spriteOverridePrefix}${name}`;

const emitChange = (name: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(spriteOverridesChangedEvent, { detail: { name } }));
};

export function getSpriteOverride(name: string): string | null {
  try {
    return getStorage()?.getItem(getKey(name)) || null;
  } catch {
    return null;
  }
}

export function listSpriteOverrides(): ReadonlyArray<string> {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const overrides = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(spriteOverridePrefix)) {
      overrides.push(key.slice(spriteOverridePrefix.length));
    }
  }

  return overrides.sort();
}

export function setSpriteOverride(name: string, dataURL: string) {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(getKey(name), dataURL);
    emitChange(name);
    return true;
  } catch {
    return false;
  }
}

export function deleteSpriteOverride(name: string) {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(getKey(name));
    emitChange(name);
    return true;
  } catch {
    return false;
  }
}

export function subscribeSpriteOverrides(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onChange = () => listener();
  window.addEventListener(spriteOverridesChangedEvent, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(spriteOverridesChangedEvent, onChange);
    window.removeEventListener('storage', onChange);
  };
}
