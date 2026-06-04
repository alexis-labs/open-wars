import type { SoundName } from '@deities/athena/info/Music.tsx';

export type ProceduralSegment = Readonly<{
  duration: number;
  endFrequency: number;
  frequency: number;
  volume?: number;
}>;

export type MachineGunProfile = Readonly<{
  /** Seconds between each round crack in one trigger. */
  roundGap: number;
  roundDuration?: number;
  rounds: number;
}>;

export type ProceduralSoundProfile = Readonly<{
  attack?: number;
  burst?: boolean;
  duration: number;
  endFrequency: number;
  frequency: number;
  loop?: boolean;
  machineGun?: MachineGunProfile;
  noise: number;
  pulseHz?: number;
  segments?: ReadonlyArray<ProceduralSegment>;
  type: OscillatorType;
  volume: number;
}>;

const attackProfiles: Partial<Record<SoundName, ProceduralSoundProfile>> = {
  'Attack/MG': {
    duration: 0.11,
    endFrequency: 140,
    frequency: 980,
    machineGun: { rounds: 5, roundGap: 0.017, roundDuration: 0.024 },
    noise: 0.72,
    burst: true,
    type: 'square',
    volume: 0.17,
  },
  'Attack/MGFast': {
    duration: 0.1,
    endFrequency: 160,
    frequency: 1100,
    machineGun: { rounds: 7, roundGap: 0.012, roundDuration: 0.02 },
    noise: 0.78,
    burst: true,
    type: 'square',
    volume: 0.16,
  },
  'Attack/MiniGun': {
    duration: 0.16,
    endFrequency: 100,
    frequency: 860,
    machineGun: { rounds: 14, roundGap: 0.009, roundDuration: 0.018 },
    noise: 0.85,
    burst: true,
    type: 'sawtooth',
    volume: 0.15,
  },
  'Attack/Pistol': {
    duration: 0.08,
    endFrequency: 200,
    frequency: 1100,
    noise: 0.65,
    burst: true,
    type: 'square',
    volume: 0.14,
  },
  'Attack/Shotgun': {
    duration: 0.14,
    endFrequency: 80,
    frequency: 420,
    noise: 0.8,
    burst: true,
    type: 'sawtooth',
    volume: 0.2,
  },
  'Attack/SniperRifle': {
    duration: 0.12,
    endFrequency: 90,
    frequency: 680,
    noise: 0.7,
    burst: true,
    type: 'triangle',
    volume: 0.18,
  },
  'Attack/LightGun': {
    duration: 0.09,
    endFrequency: 170,
    frequency: 920,
    machineGun: { rounds: 4, roundGap: 0.019, roundDuration: 0.022 },
    noise: 0.68,
    burst: true,
    type: 'square',
    volume: 0.14,
  },
  'Attack/HeavyGun': {
    duration: 0.13,
    endFrequency: 85,
    frequency: 420,
    machineGun: { rounds: 6, roundGap: 0.016, roundDuration: 0.028 },
    noise: 0.8,
    burst: true,
    type: 'sawtooth',
    volume: 0.18,
  },
  'Attack/AntiAirGun': {
    duration: 0.12,
    endFrequency: 120,
    frequency: 780,
    machineGun: { rounds: 6, roundGap: 0.014, roundDuration: 0.023 },
    noise: 0.74,
    burst: true,
    type: 'square',
    volume: 0.16,
  },
  'Attack/Artillery': {
    duration: 0.38,
    endFrequency: 42,
    frequency: 220,
    noise: 0.72,
    type: 'sawtooth',
    volume: 0.22,
  },
  'Attack/ArtilleryBattery': {
    duration: 0.42,
    endFrequency: 38,
    frequency: 180,
    noise: 0.78,
    type: 'sawtooth',
    volume: 0.24,
  },
  'Attack/HeavyArtillery': {
    duration: 0.48,
    endFrequency: 32,
    frequency: 150,
    noise: 0.82,
    type: 'sawtooth',
    volume: 0.26,
  },
  'Attack/Cannon': {
    duration: 0.32,
    endFrequency: 48,
    frequency: 260,
    noise: 0.68,
    type: 'sawtooth',
    volume: 0.2,
  },
  'Attack/Rocket': {
    duration: 0.22,
    endFrequency: 60,
    frequency: 480,
    noise: 0.45,
    type: 'sine',
    volume: 0.16,
  },
  'Attack/RocketLauncher': {
    duration: 0.18,
    endFrequency: 80,
    frequency: 620,
    noise: 0.5,
    burst: true,
    type: 'square',
    volume: 0.17,
  },
  'Attack/Rockets': {
    duration: 0.28,
    endFrequency: 55,
    frequency: 380,
    noise: 0.55,
    type: 'sawtooth',
    volume: 0.18,
  },
  'Attack/SAM': {
    duration: 0.2,
    endFrequency: 120,
    frequency: 720,
    noise: 0.4,
    type: 'sine',
    volume: 0.14,
  },
  'Attack/SAMImpact': {
    duration: 0.35,
    endFrequency: 40,
    frequency: 200,
    noise: 0.75,
    type: 'sawtooth',
    volume: 0.2,
  },
  'Attack/Bomb': {
    duration: 0.4,
    endFrequency: 35,
    frequency: 160,
    noise: 0.85,
    type: 'sawtooth',
    volume: 0.24,
  },
  'Attack/AirToAirMissile': {
    duration: 0.16,
    endFrequency: 100,
    frequency: 900,
    noise: 0.35,
    type: 'sine',
    volume: 0.13,
  },
  'Attack/Torpedo': {
    duration: 0.26,
    endFrequency: 70,
    frequency: 140,
    noise: 0.5,
    type: 'sine',
    volume: 0.12,
  },
  'Attack/TorpedoImpact': {
    duration: 0.44,
    endFrequency: 30,
    frequency: 110,
    noise: 0.8,
    type: 'sawtooth',
    volume: 0.22,
  },
  'Attack/Railgun': {
    duration: 0.14,
    endFrequency: 200,
    frequency: 1200,
    noise: 0.55,
    burst: true,
    type: 'square',
    volume: 0.16,
  },
  'Attack/RailgunImpact': {
    duration: 0.3,
    endFrequency: 50,
    frequency: 320,
    noise: 0.7,
    type: 'sawtooth',
    volume: 0.19,
  },
  'Attack/Flamethrower': {
    duration: 0.24,
    endFrequency: 180,
    frequency: 320,
    noise: 0.65,
    type: 'sawtooth',
    volume: 0.12,
  },
  'Attack/Bite': {
    duration: 0.07,
    endFrequency: 260,
    frequency: 420,
    noise: 0.35,
    type: 'triangle',
    volume: 0.1,
  },
  'Attack/ZombieBite': {
    duration: 0.09,
    endFrequency: 180,
    frequency: 300,
    noise: 0.5,
    type: 'sawtooth',
    volume: 0.11,
  },
  'Attack/Club': {
    duration: 0.08,
    endFrequency: 120,
    frequency: 280,
    noise: 0.4,
    type: 'triangle',
    volume: 0.12,
  },
  'Attack/Pow': {
    duration: 0.1,
    endFrequency: 90,
    frequency: 240,
    noise: 0.45,
    type: 'square',
    volume: 0.14,
  },
  'Attack/TentacleWhip': {
    duration: 0.12,
    endFrequency: 160,
    frequency: 380,
    noise: 0.35,
    type: 'triangle',
    volume: 0.11,
  },
};

const movementLoopProfiles: Partial<Record<SoundName, ProceduralSoundProfile>> = {
  'Movement/Soldier': {
    duration: 0.28,
    endFrequency: 95,
    frequency: 130,
    loop: true,
    noise: 0.22,
    pulseHz: 7,
    type: 'triangle',
    volume: 0.07,
  },
  'Movement/HeavySoldier': {
    duration: 0.32,
    endFrequency: 65,
    frequency: 90,
    loop: true,
    noise: 0.35,
    pulseHz: 4.5,
    type: 'sawtooth',
    volume: 0.09,
  },
  'Movement/Tires': {
    duration: 0.26,
    endFrequency: 110,
    frequency: 165,
    loop: true,
    noise: 0.28,
    pulseHz: 11,
    type: 'square',
    volume: 0.085,
  },
  'Movement/Tread': {
    duration: 0.3,
    endFrequency: 72,
    frequency: 98,
    loop: true,
    noise: 0.42,
    pulseHz: 8,
    type: 'sawtooth',
    volume: 0.095,
  },
  'Movement/Ship': {
    duration: 0.36,
    endFrequency: 55,
    frequency: 78,
    loop: true,
    noise: 0.58,
    pulseHz: 2.5,
    type: 'sine',
    volume: 0.09,
  },
  'Movement/Amphibious': {
    duration: 0.3,
    endFrequency: 68,
    frequency: 105,
    loop: true,
    noise: 0.48,
    pulseHz: 5,
    type: 'sawtooth',
    volume: 0.088,
  },
  'Movement/Air': {
    duration: 0.34,
    endFrequency: 320,
    frequency: 520,
    loop: true,
    noise: 0.18,
    pulseHz: 6,
    type: 'sine',
    volume: 0.075,
  },
  'Movement/LowAltitude': {
    duration: 0.3,
    endFrequency: 240,
    frequency: 360,
    loop: true,
    noise: 0.25,
    pulseHz: 13,
    type: 'square',
    volume: 0.08,
  },
  'Movement/AirInfantry': {
    duration: 0.32,
    endFrequency: 280,
    frequency: 440,
    loop: true,
    noise: 0.2,
    pulseHz: 8,
    type: 'sine',
    volume: 0.072,
  },
  'Movement/Rail': {
    duration: 0.22,
    endFrequency: 130,
    frequency: 175,
    loop: true,
    noise: 0.38,
    pulseHz: 18,
    type: 'square',
    volume: 0.082,
  },
};

const movementEndProfiles: Partial<Record<SoundName, ProceduralSoundProfile>> = {
  'Movement/SoldierEnd': { duration: 0.09, endFrequency: 150, frequency: 110, noise: 0.2, type: 'triangle', volume: 0.09 },
  'Movement/HeavySoldierEnd': { duration: 0.11, endFrequency: 80, frequency: 60, noise: 0.35, type: 'sawtooth', volume: 0.1 },
  'Movement/TiresEnd': { duration: 0.1, endFrequency: 90, frequency: 140, noise: 0.3, type: 'square', volume: 0.095 },
  'Movement/TreadEnd': { duration: 0.12, endFrequency: 65, frequency: 85, noise: 0.4, type: 'sawtooth', volume: 0.1 },
  'Movement/ShipEnd': { duration: 0.14, endFrequency: 50, frequency: 70, noise: 0.45, type: 'sine', volume: 0.09 },
  'Movement/AmphibiousEnd': { duration: 0.12, endFrequency: 70, frequency: 95, noise: 0.38, type: 'sawtooth', volume: 0.095 },
  'Movement/AirEnd': { duration: 0.1, endFrequency: 280, frequency: 420, noise: 0.15, type: 'sine', volume: 0.08 },
  'Movement/LowAltitudeEnd': { duration: 0.11, endFrequency: 200, frequency: 300, noise: 0.22, type: 'square', volume: 0.085 },
  'Movement/AirInfantryEnd': { duration: 0.1, endFrequency: 260, frequency: 380, noise: 0.18, type: 'sine', volume: 0.08 },
  'Movement/RailEnd': { duration: 0.08, endFrequency: 120, frequency: 160, noise: 0.35, type: 'square', volume: 0.09 },
};

export const getProceduralSoundProfile = (sound: SoundName): ProceduralSoundProfile => {
  if (attackProfiles[sound]) {
    return attackProfiles[sound]!;
  }

  if (movementLoopProfiles[sound]) {
    return movementLoopProfiles[sound]!;
  }

  if (movementEndProfiles[sound]) {
    return movementEndProfiles[sound]!;
  }

  if (sound === 'UI/EndTurn') {
    return {
      duration: 0.32,
      endFrequency: 520,
      frequency: 520,
      noise: 0.04,
      segments: [
        { duration: 0.1, endFrequency: 620, frequency: 380, volume: 0.9 },
        { duration: 0.08, endFrequency: 480, frequency: 620, volume: 0.75 },
        { duration: 0.14, endFrequency: 90, frequency: 140, volume: 1.1 },
      ],
      type: 'sine',
      volume: 0.14,
    };
  }

  if (sound.startsWith('Building/')) {
    return sound === 'Building/Collapse'
      ? { duration: 0.52, endFrequency: 32, frequency: 110, noise: 0.82, type: 'sawtooth', volume: 0.24 }
      : { duration: 0.22, endFrequency: 300, frequency: 170, noise: 0.18, type: 'triangle', volume: 0.11 };
  }

  if (sound.startsWith('Explosion') || sound === 'Attack/Bomb') {
    const air = sound.includes('Air');
    const naval = sound.includes('Naval');
    return {
      duration: air ? 0.36 : naval ? 0.44 : 0.5,
      endFrequency: 35,
      frequency: air ? 220 : 100,
      noise: 0.78,
      type: 'sawtooth',
      volume: 0.23,
    };
  }

  if (sound.startsWith('Crystal/')) {
    return {
      duration: 0.34,
      endFrequency: 920,
      frequency: 500,
      noise: 0.04,
      type: 'sine',
      volume: 0.11,
    };
  }

  if (sound.startsWith('Talking/')) {
    return {
      duration: 0.055,
      endFrequency: sound === 'Talking/Low' ? 190 : sound === 'Talking/High' ? 520 : 340,
      frequency: sound === 'Talking/Low' ? 150 : sound === 'Talking/High' ? 420 : 260,
      noise: 0.08,
      type: 'triangle',
      volume: 0.07,
    };
  }

  if (sound === 'Unit/Heal' || sound === 'Unit/Supply') {
    return { duration: 0.3, endFrequency: 920, frequency: 520, noise: 0.05, type: 'sine', volume: 0.11 };
  }

  switch (sound) {
    case 'UI/Cancel':
      return { duration: 0.1, endFrequency: 180, frequency: 320, noise: 0, type: 'triangle', volume: 0.1 };
    case 'UI/Next':
      return { duration: 0.08, endFrequency: 760, frequency: 420, noise: 0, type: 'sine', volume: 0.08 };
    case 'UI/Previous':
      return { duration: 0.08, endFrequency: 420, frequency: 760, noise: 0, type: 'sine', volume: 0.08 };
    case 'UI/LongPress':
      return { duration: 0.28, endFrequency: 820, frequency: 220, noise: 0.05, type: 'sawtooth', volume: 0.1 };
    case 'UI/Put':
      return { duration: 0.08, endFrequency: 220, frequency: 180, noise: 0.2, type: 'square', volume: 0.1 };
    case 'UI/Skip':
      return { duration: 0.16, endFrequency: 980, frequency: 260, noise: 0, type: 'sawtooth', volume: 0.1 };
    case 'UI/Accept':
    case 'UI/Start':
      return { duration: 0.12, endFrequency: 640, frequency: 420, noise: 0, type: 'sine', volume: 0.1 };
    case 'Fireworks':
      return { duration: 0.55, endFrequency: 1200, frequency: 400, noise: 0.2, type: 'sine', volume: 0.14 };
    case 'Unit/Spawn':
    case 'Unit/Capture':
      return { duration: 0.2, endFrequency: 720, frequency: 360, noise: 0.08, type: 'sine', volume: 0.12 };
    case 'Unit/CreateBuilding':
      return { duration: 0.25, endFrequency: 400, frequency: 200, noise: 0.2, type: 'triangle', volume: 0.11 };
    case 'Unit/Load':
    case 'Unit/Drop':
      return { duration: 0.14, endFrequency: 280, frequency: 160, noise: 0.25, type: 'square', volume: 0.1 };
    case 'Unit/Sabotage':
      return { duration: 0.22, endFrequency: 90, frequency: 240, noise: 0.55, type: 'sawtooth', volume: 0.14 };
    default:
      if (sound.startsWith('Unit/')) {
        return { duration: 0.14, endFrequency: 240, frequency: 320, noise: 0.12, type: 'triangle', volume: 0.1 };
      }
      return { duration: 0.18, endFrequency: 220, frequency: 330, noise: 0.05, type: 'triangle', volume: 0.12 };
  }
};

export const getTalkingBlipProfile = (
  sound: SoundName,
  variant: number,
): ProceduralSoundProfile => {
  const base = getProceduralSoundProfile(sound);
  const offset = (variant % 7) * 18;
  return {
    ...base,
    duration: 0.045,
    endFrequency: base.endFrequency + offset,
    frequency: base.frequency + offset,
    loop: false,
    volume: base.volume * 0.85,
  };
};
