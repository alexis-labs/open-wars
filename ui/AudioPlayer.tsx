import { SongName, SoundName } from '@deities/athena/info/Music.tsx';
import parseInteger from '@nkzw/core/parseInteger.js';
import { Music, Sounds } from 'athena-crisis:audio';
import { Howl, Howler } from 'howler';

export type AudioVolumeType = 'master' | 'music' | 'sound';

// Keep in sync with `ares/index.html`.
const storageKeys = {
  master: '::AC::volume',
  music: '::AC::volume-music',
  sound: '::AC::volume-sound',
} as const;

const pausedKey = '::AC::paused';

const isMusic = (name: SoundName | SongName): name is SongName => Music.has(name as SongName);

class AudioPlayer {
  private readonly hasProceduralFallback: boolean;
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
      timer: number;
    }>
  >();

  constructor(private readonly music: ReadonlyMap<SongName | SoundName, string>) {
    this.hasProceduralFallback = new Set(music.values()).size <= 2;
  }

  preload() {
    if (!this.didPreload) {
      this.didPreload = true;
      (window.requestIdleCallback || requestAnimationFrame)(() => {
        if (!this.hasProceduralFallback) {
          for (const [name] of Sounds) {
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

    const instance = this.getInstance(sound);
    const reduceVolume = sound === 'Fireworks' || sound.startsWith('Talking/');
    const volume = getVolume('sound') * (reduceVolume ? 0.66 : 1);

    if (this.paused || rate <= 0 || rate === Number.POSITIVE_INFINITY || volume <= 0) {
      return;
    }

    if (this.hasProceduralFallback) {
      this.playProceduralSound(sound, rate, volume);
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`%caudio › playing sound '${sound}'.`, `color: #777;`);
    }

    if (instance.playing()) {
      instance.seek(0);
    }

    instance.volume(volume);
    instance.rate(rate);
    instance.play();
  }

  playOrContinueSound(sound: SoundName, rate = 1) {
    if (this.hasProceduralFallback) {
      if (!this.proceduralSounds.has(sound)) {
        this.playProceduralSound(sound, rate, getVolume('sound'));
      }
      return;
    }

    const instance = this.getInstance(sound);
    if (!instance.playing()) {
      this.playSound(sound, rate);
    }
  }

  stop(name: SoundName | SongName, duration = 250) {
    if (this.hasProceduralFallback && !isMusic(name)) {
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

  private getInstance(name: SongName | SoundName) {
    if (!this.instances.has(name)) {
      const source = this.music.get(name);
      if (!source) {
        throw new Error(`No source for '${name}'.`);
      }

      const isMusicType = isMusic(name);
      const isMessageSound = name.startsWith('Talking/');
      const instance = new Howl({
        html5: false,
        loop: isMusicType || isMessageSound,
        onplayerror: isMusicType
          ? () =>
              instance.once('unlock', () => {
                if (this.currentInstance === instance && !instance.playing()) {
                  instance.play();
                }
              })
          : undefined,
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

  private playProceduralSound(sound: SoundName, rate: number, volume: number) {
    const context = this.getAudioContext();
    if (!context || this.paused || rate <= 0 || volume <= 0) {
      return;
    }

    void context.resume();
    this.stopProceduralSound(sound, 0);

    const profile = getProceduralSoundProfile(sound);
    const now = context.currentTime;
    const duration = profile.duration / rate;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume * profile.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(context.destination);

    const oscillator = context.createOscillator();
    oscillator.frequency.setValueAtTime(profile.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.endFrequency, now + duration);
    oscillator.type = profile.type;
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + duration);

    if (profile.noise > 0) {
      const noiseGain = context.createGain();
      noiseGain.gain.value = volume * profile.volume * profile.noise;
      noiseGain.connect(gain);
      const noise = context.createBufferSource();
      const buffer = context.createBuffer(
        1,
        Math.max(1, Math.ceil(context.sampleRate * duration)),
        context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
      noise.connect(noiseGain);
      noise.start(now);
      noise.stop(now + duration);
    }

    const timer = window.setTimeout(() => {
      gain.disconnect();
      this.proceduralSounds.delete(sound);
      if (profile.loop && !this.paused) {
        this.playProceduralSound(sound, rate, volume);
      }
    }, duration * 1000);
    this.proceduralSounds.set(sound, { gain, timer });
  }

  private stopProceduralSound(sound: SoundName, duration: number) {
    const proceduralSound = this.proceduralSounds.get(sound);
    if (!proceduralSound) {
      return;
    }

    window.clearTimeout(proceduralSound.timer);
    this.proceduralSounds.delete(sound);

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

type ProceduralSoundProfile = Readonly<{
  duration: number;
  endFrequency: number;
  frequency: number;
  loop?: boolean;
  noise: number;
  type: OscillatorType;
  volume: number;
}>;

const getProceduralSoundProfile = (sound: SoundName): ProceduralSoundProfile => {
  if (sound.startsWith('Movement/') && !sound.endsWith('End')) {
    return {
      duration: 0.18,
      endFrequency: sound === 'Movement/Air' ? 420 : 95,
      frequency: sound === 'Movement/Air' ? 520 : 120,
      loop: true,
      noise: sound === 'Movement/Air' ? 0.1 : 0.35,
      type: sound === 'Movement/Air' ? 'sine' : 'sawtooth',
      volume: 0.08,
    };
  }

  if (sound.startsWith('Movement/')) {
    return {
      duration: 0.12,
      endFrequency: 180,
      frequency: 120,
      noise: 0.25,
      type: 'triangle',
      volume: 0.1,
    };
  }

  if (sound.startsWith('Explosion') || sound === 'Attack/Bomb') {
    return {
      duration: 0.45,
      endFrequency: 45,
      frequency: 140,
      noise: 0.75,
      type: 'sawtooth',
      volume: 0.24,
    };
  }

  if (sound.startsWith('Attack/')) {
    const isHeavy =
      sound.includes('Artillery') ||
      sound.includes('Cannon') ||
      sound.includes('Rocket') ||
      sound.includes('SAM') ||
      sound.includes('Torpedo');
    return {
      duration: isHeavy ? 0.3 : 0.13,
      endFrequency: isHeavy ? 70 : 360,
      frequency: isHeavy ? 220 : 820,
      noise: isHeavy ? 0.5 : 0.3,
      type: isHeavy ? 'sawtooth' : 'square',
      volume: isHeavy ? 0.2 : 0.14,
    };
  }

  if (sound.startsWith('Crystal/') || sound === 'Unit/Heal' || sound === 'Unit/Supply') {
    return {
      duration: 0.35,
      endFrequency: 960,
      frequency: 520,
      noise: 0.05,
      type: 'sine',
      volume: 0.12,
    };
  }

  if (sound.startsWith('Talking/')) {
    return {
      duration: 0.22,
      endFrequency: sound === 'Talking/Low' ? 170 : sound === 'Talking/High' ? 420 : 280,
      frequency: sound === 'Talking/Low' ? 140 : sound === 'Talking/High' ? 360 : 240,
      loop: true,
      noise: 0.05,
      type: 'triangle',
      volume: 0.06,
    };
  }

  switch (sound) {
    case 'UI/Cancel':
      return {
        duration: 0.1,
        endFrequency: 180,
        frequency: 320,
        noise: 0,
        type: 'triangle',
        volume: 0.1,
      };
    case 'UI/Next':
    case 'UI/Previous':
      return {
        duration: 0.08,
        endFrequency: sound === 'UI/Next' ? 760 : 420,
        frequency: sound === 'UI/Next' ? 420 : 760,
        noise: 0,
        type: 'sine',
        volume: 0.08,
      };
    case 'UI/LongPress':
      return {
        duration: 0.28,
        endFrequency: 820,
        frequency: 220,
        noise: 0.05,
        type: 'sawtooth',
        volume: 0.1,
      };
    case 'UI/Put':
      return {
        duration: 0.08,
        endFrequency: 220,
        frequency: 180,
        noise: 0.2,
        type: 'square',
        volume: 0.1,
      };
    case 'UI/Skip':
      return {
        duration: 0.16,
        endFrequency: 980,
        frequency: 260,
        noise: 0,
        type: 'sawtooth',
        volume: 0.1,
      };
    case 'UI/Accept':
    case 'UI/Start':
      return {
        duration: 0.12,
        endFrequency: 640,
        frequency: 420,
        noise: 0,
        type: 'sine',
        volume: 0.1,
      };
    default:
      return {
        duration: 0.18,
        endFrequency: 220,
        frequency: 330,
        noise: sound.startsWith('Unit/') ? 0.15 : 0.05,
        type: 'triangle',
        volume: 0.12,
      };
  }
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
