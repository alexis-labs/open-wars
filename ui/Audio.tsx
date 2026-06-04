import { isIOS, isSafari } from './Browser.tsx';
import { buildSoundsMap } from './audio/manifest.ts';
import { EmptyAAC, EmptyOGG } from './audio/placeholders.ts';

const useOGG =
  !isIOS && !isSafari && document.createElement('audio').canPlayType('audio/ogg') === 'probably';

export const Sounds = buildSoundsMap(useOGG);

export const Music = useOGG
  ? new Map([
      ['apollos-ascend', EmptyOGG],
      ['apollos-gleam', EmptyOGG],
      ['ares-chaos', EmptyOGG],
      ['ares-skirmish', EmptyOGG],
      ['artemis-glade', EmptyOGG],
      ['artemis-hunt', EmptyOGG],
      ['astraeus-expanse', EmptyOGG],
      ['astraeus-wings', EmptyOGG],
      ['chiones-cloud', EmptyOGG],
      ['chiones-leap', EmptyOGG],
      ['eos-dawn', EmptyOGG],
      ['gaias-rise', EmptyOGG],
      ['hestias-serenade', EmptyOGG],
      ['poseidons-tide', EmptyOGG],
      ['poseidons-wrath', EmptyOGG],
      ['selenes-tranquility', EmptyOGG],
      ['selenes-voyage', EmptyOGG],
    ] as const)
  : new Map([
      ['apollos-ascend', EmptyAAC],
      ['apollos-gleam', EmptyAAC],
      ['ares-chaos', EmptyAAC],
      ['ares-skirmish', EmptyAAC],
      ['artemis-glade', EmptyAAC],
      ['artemis-hunt', EmptyAAC],
      ['astraeus-expanse', EmptyAAC],
      ['astraeus-wings', EmptyAAC],
      ['chiones-cloud', EmptyAAC],
      ['chiones-leap', EmptyAAC],
      ['eos-dawn', EmptyAAC],
      ['gaias-rise', EmptyAAC],
      ['hestias-serenade', EmptyAAC],
      ['poseidons-tide', EmptyAAC],
      ['poseidons-wrath', EmptyAAC],
      ['selenes-tranquility', EmptyAAC],
      ['selenes-voyage', EmptyAAC],
    ] as const);

export type SoundT = typeof Sounds;
export type MusicT = typeof Music;
