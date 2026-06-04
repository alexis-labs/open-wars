import { SongName, SoundName } from '@deities/athena/info/Music.tsx';
import parseInteger from '@nkzw/core/parseInteger.js';
import { Music, Sounds } from 'athena-crisis:audio';
import { Howl, Howler } from 'howler';
import { getProceduralSoundProfile, getTalkingBlipProfile } from './audio/proceduralProfiles.ts';
import { isPlaceholderSource } from './audio/placeholders.ts';
import { proceduralSampleRate, renderProceduralSamples } from './audio/synthesize.ts';

export type AudioVolumeType = 'master' | 'music' | 'sound';

const maxConcurrentSfx = 8;

// Keep in sync with `ares/index.html`.
const storageKeys = {
  master: '::AC::volume',
  music: '::AC::volume-music',
  sound: '::AC::volume-sound',
} as const;

const pausedKey = '::AC::paused';

const isMusic = (name: SoundName | SongName): name is SongName => Music.has(name as SongName);

class AudioPlayer {
  private activeSfxCount = 0;
  private audioContext: AudioContext | null = null;
  private readonly instances = new Map<SongName | SoundName, Howl>();
  private currentInstance: Howl | null = null;
  private currentSong: SongName | null = null;
  private didPreload = false;
  private paused = parseInteger(localStorage.getItem(pausedKey) || '') === 1;
  private readonly proceduralSounds = new Map<
    SoundName,
    Readonly<{
      gain: GainNode;
      source: AudioBufferSourceNode;
      timer: number;
    }>
  >();

  constructor(private readonly music: ReadonlyMap<SongName | SoundName, string>) {}

  preload() {
    if (!this.didPreload) {
      this.didPreload = true;
      (window.requestIdleCallback || requestAnimationFrame)(() => {
        for (const [name] of Sounds) {
          if (!this.shouldUseProcedural(name)) {
            this.getInstance(name);
          }
        }
      });
    }
  }

  play(song: SongName) {
    const instance = this.getInstance(song);
    const previousSong = this.currentSong;
    if (this.currentInstance === instance) {
      return;
    }

    this.stopCurrentSong();
    this.currentInstance = instance;
    this.currentSong = song;

    const volume = getVolume('music');
    if (volume <= 0) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(
        `%caudio ›${previousSong ? ` from '${previousSong}' to` : ''} '${song}'.`,
        `color: #777;`,
      );
    }

    if (!this.paused) {
      instance.volume(volume);
      instance.off('fade');
      if (!instance.playing()) {
        instance.fade(0, volume, 250);
      }
      instance.play();
    }
  }

  playSound(sound: SoundName, rate = 1) {
    if (rate > 1 && sound === 'Attack/MG') {
      sound = 'Attack/MGFast';
      rate = 1;
    }

    const reduceVolume = sound === 'Fireworks' || sound.startsWith('Talking/');
    const volume = getVolume('sound') * (reduceVolume ? 0.66 : 1);

    if (this.paused || rate <= 0 || rate === Number.POSITIVE_INFINITY || volume <= 0) {
      return;
    }

    if (this.shouldUseProcedural(sound)) {
      this.playProceduralSound(sound, rate, volume);
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`%caudio › playing sound '${sound}'.`, `color: #777;`);
    }

    const instance = this.getInstance(sound);
    if (instance.playing()) {
      instance.seek(0);
    }

    instance.volume(volume);
    instance.rate(rate);
    instance.once('playerror', () => this.playProceduralSound(sound, rate, volume));
    instance.play();
  }

  playTalkingBlip(sound: SoundName, variant = 0) {
    const volume = getVolume('sound') * 0.66;
    if (this.paused || volume <= 0) {
      return;
    }

    if (this.shouldUseProcedural(sound)) {
      this.playProceduralProfile(getTalkingBlipProfile(sound, variant), 1, volume, false);
      return;
    }

    this.playSound(sound, 1);
  }

  playOrContinueSound(sound: SoundName, rate = 1) {
    if (this.shouldUseProcedural(sound)) {
      if (!this.proceduralSounds.has(sound)) {
        const profile = getProceduralSoundProfile(sound);
        this.playProceduralSound(sound, rate, getVolume('sound'), profile.loop ?? false);
      }
      return;
    }

    const instance = this.getInstance(sound);
    if (!instance.playing()) {
      this.playSound(sound, rate);
    }
  }

  stop(name: SoundName | SongName, duration = 250) {
    if (!isMusic(name) && this.shouldUseProcedural(name)) {
      this.stopProceduralSound(name, duration);
      return;
    }

    const instance = this.getInstance(name);
    instance.off('fade');
    if (instance.playing() && duration > 0) {
      instance.fade(instance.volume() || 1, 0, duration);
      instance.once('fade', () => instance.stop());
    } else {
      instance.stop();
    }
  }

  stopCurrentSong() {
    const song = this.currentSong;
    if (song) {
      this.stop(song);
    }
    this.currentInstance = null;
    this.currentSong = null;
  }

  isPaused() {
    return this.paused;
  }

  pause(temporary?: boolean) {
    if (this.paused) {
      return;
    }

    this.paused = true;
    this.currentInstance?.pause();
    for (const sound of this.proceduralSounds.keys()) {
      this.stopProceduralSound(sound, 0);
    }
    if (!temporary) {
      localStorage.setItem(pausedKey, String(1));
    }
  }

  resume() {
    if (!this.paused) {
      return;
    }

    this.paused = false;
    void this.audioContext?.resume();
    localStorage.removeItem(pausedKey);
    const instance = this.currentInstance;
    const volume = getVolume('music');
    if (instance && volume > 0) {
      if (instance.volume() <= 0) {
        instance.volume(volume);
      }

      if (!instance.playing()) {
        instance.play();
      }
    }
  }

  togglePause() {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  getVolume(type: AudioVolumeType) {
    return type === 'master' ? Howler.volume() : (getVolume(type) ?? 1);
  }

  setVolume(type: AudioVolumeType, volume: number) {
    const previousVolume = getVolume('music');
    localStorage.setItem(storageKeys[type], String(volume));
    if (type === 'master') {
      Howler.volume(volume);
    } else if (type === 'music') {
      this.currentInstance?.volume(volume);
      const song = this.currentSong;
      if (song && previousVolume <= 0 && volume > 0) {
        this.currentInstance?.stop();
        this.currentInstance = null;
        requestAnimationFrame(() => this.play(song));
      }
    }

    if (
      (type === 'music' || type === 'sound') &&
      getVolume('music') <= 0 &&
      getVolume('sound') <= 0
    ) {
      this.pause();
    }
  }

  private shouldUseProcedural(sound: SoundName | SongName) {
    if (isMusic(sound)) {
      return isPlaceholderSource(this.music.get(sound));
    }
    return isPlaceholderSource(this.music.get(sound));
  }

  private getInstance(name: SongName | SoundName) {
    if (!this.instances.has(name)) {
      const source = this.music.get(name);
      if (!source) {
        throw new Error(`No source for '${name}'.`);
      }

      const isMusicType = isMusic(name);
      const isMovementLoop = name.startsWith('Movement/') && !name.endsWith('End');
      const instance = new Howl({
        html5: false,
        loop: isMusicType || isMovementLoop,
        onplayerror: isMusicType
          ? () =>
              instance.once('unlock', () => {
                if (this.currentInstance === instance && !instance.playing()) {
                  instance.play();
                }
              })
          : () => {
              if (!isMusicType) {
                const volume = getVolume('sound') * (name.startsWith('Talking/') ? 0.66 : 1);
                this.playProceduralSound(name, 1, volume);
              }
            },
        src: [source],
      });

      this.instances.set(name, instance);
    }
    return this.instances.get(name)!;
  }

  private getAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }

      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  private playProceduralSound(
    sound: SoundName,
    rate: number,
    volume: number,
    loop = getProceduralSoundProfile(sound).loop,
  ) {
    this.playProceduralProfile(getProceduralSoundProfile(sound), rate, volume, loop, sound);
  }

  private playProceduralProfile(
    profile: ReturnType<typeof getProceduralSoundProfile>,
    rate: number,
    volume: number,
    loop: boolean | undefined,
    sound?: SoundName,
  ) {
    const context = this.getAudioContext();
    if (!context || this.paused || rate <= 0 || volume <= 0) {
      return;
    }

    if (!loop && this.activeSfxCount >= maxConcurrentSfx) {
      return;
    }

    void context.resume();
    if (sound) {
      this.stopProceduralSound(sound, 0);
    }

    const samples = renderProceduralSamples(profile, rate);
    const buffer = context.createBuffer(1, samples.length, proceduralSampleRate);
    buffer.copyToChannel(samples, 0);

    const now = context.currentTime;
    const duration = buffer.duration;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    if (!loop) {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } else {
      gain.gain.setValueAtTime(volume, now + 0.008);
    }
    gain.connect(context.destination);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1;
    source.loop = loop ?? false;
    source.connect(gain);
    source.start(now);
    if (!loop) {
      source.stop(now + duration);
    }

    if (!loop) {
      this.activeSfxCount++;
    }

    const timer = window.setTimeout(
      () => {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
        gain.disconnect();
        if (sound) {
          this.proceduralSounds.delete(sound);
        }
        if (!loop) {
          this.activeSfxCount = Math.max(0, this.activeSfxCount - 1);
        }
        if (loop && sound && !this.paused) {
          this.playProceduralSound(sound, rate, volume, true);
        }
      },
      loop ? duration * 1000 : duration * 1000 + 20,
    );

    if (sound && loop) {
      this.proceduralSounds.set(sound, { gain, source, timer });
    }
  }

  private stopProceduralSound(sound: SoundName, duration: number) {
    const proceduralSound = this.proceduralSounds.get(sound);
    if (!proceduralSound) {
      return;
    }

    window.clearTimeout(proceduralSound.timer);
    this.proceduralSounds.delete(sound);

    try {
      proceduralSound.source.stop();
    } catch {
      // Already stopped.
    }

    const context = this.audioContext;
    if (!context || duration <= 0) {
      proceduralSound.gain.disconnect();
      return;
    }

    const now = context.currentTime;
    proceduralSound.gain.gain.cancelScheduledValues(now);
    proceduralSound.gain.gain.setValueAtTime(proceduralSound.gain.gain.value || 0.0001, now);
    proceduralSound.gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
    window.setTimeout(() => proceduralSound.gain.disconnect(), duration);
  }
}

const getVolume = (type: AudioVolumeType) => {
  const volume = Number.parseFloat(localStorage.getItem(storageKeys[type]) || '');
  return Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 1;
};

const hasMasterVolume = () => localStorage.getItem(storageKeys.master) !== null;

Howler.volume(hasMasterVolume() ? getVolume('master') : 0.66);

const audioPlayer = new AudioPlayer(new Map([...Music, ...Sounds]));

export default audioPlayer;

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    audioPlayer.stopCurrentSong();
  });
}
