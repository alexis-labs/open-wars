import type { MachineGunProfile, ProceduralSoundProfile } from './proceduralProfiles.ts';

const sampleRate = 44100;

function envelope(t: number, attack: number, loop?: boolean) {
  if (loop) {
    return 0.85 + 0.15 * Math.sin(t * Math.PI * 2);
  }
  const a = Math.max(0.001, attack);
  if (t < a) {
    return t / a;
  }
  return Math.sin(((t - a) / (1 - a)) * Math.PI) ** 1.35;
}

function oscillatorSample(phase: number, type: OscillatorType) {
  if (type === 'square') {
    return Math.sign(Math.sin(phase)) * 0.55;
  }
  if (type === 'sawtooth') {
    return ((phase / Math.PI) % 2) - 1;
  }
  if (type === 'triangle') {
    return (2 / Math.PI) * Math.asin(Math.sin(phase));
  }
  return Math.sin(phase);
}

function renderMachineGunRound(
  profile: ProceduralSoundProfile,
  roundDuration: number,
  volumeScale: number,
): Float32Array {
  const length = Math.max(1, Math.ceil(sampleRate * roundDuration));
  const samples = new Float32Array(length);
  const freqStart = profile.frequency;
  const freqEnd = Math.max(60, profile.endFrequency);

  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = (1 - t) ** 1.8;
    const frequency = freqStart * (freqEnd / freqStart) ** t;
    const phase = (2 * Math.PI * frequency * i) / sampleRate;
    let sample = oscillatorSample(phase, profile.type) * env * profile.volume * volumeScale;
    if (t < 0.35) {
      sample += (Math.random() * 2 - 1) * profile.noise * (1 - t / 0.35) * 1.15;
    }
    if (profile.noise > 0) {
      sample += (Math.random() * 2 - 1) * profile.noise * env * 0.35;
    }
    samples[i] = sample;
  }

  return samples;
}

function renderMachineGunBurst(
  profile: ProceduralSoundProfile,
  machineGun: MachineGunProfile,
  rate: number,
): Float32Array {
  const roundDuration = (machineGun.roundDuration ?? 0.022) / rate;
  const roundGap = machineGun.roundGap / rate;
  const totalDuration =
    machineGun.rounds * roundGap + roundDuration + 0.012 / rate;
  const length = Math.max(1, Math.ceil(sampleRate * totalDuration));
  const samples = new Float32Array(length);

  for (let round = 0; round < machineGun.rounds; round++) {
    const start = Math.floor(sampleRate * round * roundGap);
    const roundSamples = renderMachineGunRound(
      profile,
      roundDuration,
      0.88 + (round % 3) * 0.06,
    );
    for (let i = 0; i < roundSamples.length && start + i < length; i++) {
      samples[start + i] += roundSamples[i];
    }
  }

  // Subtle brass tail after the burst (metralhadora body).
  const tailStart = Math.floor(sampleRate * (machineGun.rounds * roundGap + roundDuration * 0.5));
  const tailLength = Math.min(length - tailStart, Math.ceil(sampleRate * 0.04 / rate));
  for (let i = 0; i < tailLength; i++) {
    const t = i / tailLength;
    const env = (1 - t) ** 2;
    const frequency = profile.endFrequency * (1 - t * 0.4);
    const phase = (2 * Math.PI * frequency * i) / sampleRate;
    samples[tailStart + i] +=
      Math.sin(phase) * env * profile.volume * 0.25 +
      (Math.random() * 2 - 1) * 0.12 * env;
  }

  let peak = 0;
  for (let i = 0; i < length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  if (peak > 1) {
    for (let i = 0; i < length; i++) {
      samples[i] /= peak;
    }
  }

  return samples;
}

export function renderProceduralSamples(
  profile: ProceduralSoundProfile,
  rate = 1,
): Float32Array {
  if (profile.machineGun) {
    return renderMachineGunBurst(profile, profile.machineGun, rate);
  }

  if (profile.segments?.length) {
    const totalDuration =
      profile.segments.reduce((sum, segment) => sum + segment.duration, 0) / rate;
    const length = Math.max(1, Math.ceil(sampleRate * totalDuration));
    const samples = new Float32Array(length);
    let offset = 0;

    for (const segment of profile.segments) {
      const segmentLength = Math.max(1, Math.ceil((sampleRate * segment.duration) / rate));
      const freqStart = segment.frequency;
      const freqEnd = Math.max(20, segment.endFrequency);
      const segmentVolume = (segment.volume ?? 1) * profile.volume;

      for (let i = 0; i < segmentLength && offset + i < length; i++) {
        const t = i / segmentLength;
        const env = envelope(t, profile.attack ?? 0.08);
        const frequency = freqStart * (freqEnd / freqStart) ** t;
        const phase = (2 * Math.PI * frequency * (offset + i)) / sampleRate;
        let sample = oscillatorSample(phase, profile.type) * env * segmentVolume;
        if (profile.noise > 0) {
          sample += (Math.random() * 2 - 1) * profile.noise * env * segmentVolume;
        }
        samples[offset + i] += sample;
      }
      offset += segmentLength;
    }

    return samples;
  }

  const duration = profile.duration / rate;
  const length = Math.max(1, Math.ceil(sampleRate * duration));
  const samples = new Float32Array(length);
  const freqStart = profile.frequency;
  const freqEnd = Math.max(20, profile.endFrequency);
  const attack = profile.burst ? 0.02 : (profile.attack ?? 0.12);
  const pulseHz = profile.pulseHz ?? 0;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    let env = envelope(t, attack, profile.loop);
    if (pulseHz > 0) {
      env *= 0.45 + 0.55 * Math.abs(Math.sin((t * duration * pulseHz * Math.PI * 2) % (Math.PI * 2)));
    }
    const frequency = freqStart * (freqEnd / freqStart) ** t;
    const phase = (2 * Math.PI * frequency * i) / sampleRate;
    let sample = oscillatorSample(phase, profile.type) * env * profile.volume;
    if (profile.burst && t < 0.15) {
      sample += (Math.random() * 2 - 1) * 0.9 * (1 - t / 0.15);
    }
    if (profile.noise > 0) {
      sample += (Math.random() * 2 - 1) * profile.noise * env;
    }
    samples[i] = sample;
  }

  return samples;
}

export const proceduralSampleRate = sampleRate;
