declare const __USE_LOCAL_ART__: boolean | undefined;

const REMOTE_ART_ORIGIN = 'https://art.athenacrisis.com';

export const AssetVersion = 'v19';

/** @deprecated Use {@link assetPath} or {@link assetSprite}. */
export const AssetDomain = REMOTE_ART_ORIGIN;

function envUseLocalArt(): boolean | undefined {
  const value = import.meta.env.VITE_USE_LOCAL_ART;
  if (value === '1' || value === 'true') {
    return true;
  }
  if (value === '0' || value === 'false') {
    return false;
  }
  return undefined;
}

export function useLocalArtAssets(): boolean {
  const fromEnv = envUseLocalArt();
  if (fromEnv === false) {
    return false;
  }
  if (fromEnv === true) {
    return true;
  }
  return typeof __USE_LOCAL_ART__ === 'boolean' && __USE_LOCAL_ART__;
}

export function assetPath(relativePath: string): string {
  const normalized = relativePath.replace(/^\//, '');
  if (useLocalArtAssets()) {
    return `/${AssetVersion}/${normalized}`;
  }
  return `${REMOTE_ART_ORIGIN}/${AssetVersion}/${normalized}`;
}

export function assetSprite(name: string): string {
  return assetPath(name.endsWith('.png') ? name : `${name}.png`);
}
