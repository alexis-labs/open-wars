import type { SoundName } from '@deities/athena/info/Music.tsx';

export type ActionCategory =
  | 'attack'
  | 'movement'
  | 'explosion'
  | 'unit'
  | 'building'
  | 'ui'
  | 'dialogue'
  | 'crystal'
  | 'misc';

export type GameActionSound = Readonly<{
  action: string;
  category: ActionCategory;
  sound: SoundName;
  trigger: string;
}>;

/** Step 1 — every gameplay action that plays (or should play) a sound. */
export const gameActionSounds: ReadonlyArray<GameActionSound> = [
  // Turn & match flow
  {
    action: 'startTurn',
    category: 'ui',
    sound: 'UI/EndTurn',
    trigger: 'hera/lib/addEndTurnAnimations.tsx — banner at new player turn',
  },
  {
    action: 'startMatch',
    category: 'ui',
    sound: 'UI/Start',
    trigger: 'hera/lib/startGameAnimation.tsx',
  },
  {
    action: 'skipAnimation',
    category: 'ui',
    sound: 'UI/Skip',
    trigger: 'hera/GameMap.tsx',
  },

  // UI feedback
  { action: 'uiAccept', category: 'ui', sound: 'UI/Accept', trigger: 'menus, GameActions, buttons' },
  { action: 'uiCancel', category: 'ui', sound: 'UI/Cancel', trigger: 'menus, GameMap' },
  { action: 'uiNext', category: 'ui', sound: 'UI/Next', trigger: 'GameActions, AISelector' },
  { action: 'uiPrevious', category: 'ui', sound: 'UI/Previous', trigger: 'GameActions, AISelector' },
  { action: 'uiLongPress', category: 'ui', sound: 'UI/LongPress', trigger: 'ActionWheel, GameMap' },
  { action: 'editorPlace', category: 'ui', sound: 'UI/Put', trigger: 'MapEditor DesignBehavior' },

  // Movement — by vehicle / locomotion type (MovementType → Unit.movementType)
  {
    action: 'moveInfantry',
    category: 'movement',
    sound: 'Movement/Soldier',
    trigger: 'MovementTypes.Soldier — foot soldiers',
  },
  {
    action: 'moveHeavyInfantry',
    category: 'movement',
    sound: 'Movement/HeavySoldier',
    trigger: 'MovementTypes.HeavySoldier — mechs / heavy troops',
  },
  {
    action: 'moveWheels',
    category: 'movement',
    sound: 'Movement/Tires',
    trigger: 'MovementTypes.Tires — cars, jeeps, light vehicles',
  },
  {
    action: 'moveTread',
    category: 'movement',
    sound: 'Movement/Tread',
    trigger: 'MovementTypes.Tread — tanks, robots, tread vehicles',
  },
  {
    action: 'moveShip',
    category: 'movement',
    sound: 'Movement/Ship',
    trigger: 'MovementTypes.Ship — naval units',
  },
  {
    action: 'moveAmphibious',
    category: 'movement',
    sound: 'Movement/Amphibious',
    trigger: 'MovementTypes.Amphibious — LAV / hover-shore',
  },
  {
    action: 'moveAircraft',
    category: 'movement',
    sound: 'Movement/Air',
    trigger: 'MovementTypes.Air — fighters, bombers',
  },
  {
    action: 'moveHelicopter',
    category: 'movement',
    sound: 'Movement/LowAltitude',
    trigger: 'MovementTypes.LowAltitude — helicopters, gunships',
  },
  {
    action: 'moveParatrooper',
    category: 'movement',
    sound: 'Movement/AirInfantry',
    trigger: 'MovementTypes.AirInfantry — air soldiers',
  },
  {
    action: 'moveTrain',
    category: 'movement',
    sound: 'Movement/Rail',
    trigger: 'MovementTypes.Rail — rail units',
  },

  // Weapons (Attack/*) — fired from WeaponAnimation via AttackAnimation
  { action: 'fireMG', category: 'attack', sound: 'Attack/MG', trigger: 'Weapons.MG' },
  { action: 'fireMGFast', category: 'attack', sound: 'Attack/MGFast', trigger: 'rapid MG burst' },
  { action: 'fireMiniGun', category: 'attack', sound: 'Attack/MiniGun', trigger: 'Weapons.MiniGun' },
  { action: 'firePistol', category: 'attack', sound: 'Attack/Pistol', trigger: 'Weapons.Pistol' },
  { action: 'fireShotgun', category: 'attack', sound: 'Attack/Shotgun', trigger: 'Weapons.Shotgun' },
  { action: 'fireSniper', category: 'attack', sound: 'Attack/SniperRifle', trigger: 'Weapons.SniperRifle' },
  { action: 'fireLightGun', category: 'attack', sound: 'Attack/LightGun', trigger: 'light cannons' },
  { action: 'fireHeavyGun', category: 'attack', sound: 'Attack/HeavyGun', trigger: 'heavy machine guns' },
  { action: 'fireAntiAir', category: 'attack', sound: 'Attack/AntiAirGun', trigger: 'Weapons.AntiAirGun' },
  { action: 'fireArtillery', category: 'attack', sound: 'Attack/Artillery', trigger: 'Weapons.Artillery' },
  {
    action: 'fireArtilleryBattery',
    category: 'attack',
    sound: 'Attack/ArtilleryBattery',
    trigger: 'Weapons.Battery',
  },
  {
    action: 'fireHeavyArtillery',
    category: 'attack',
    sound: 'Attack/HeavyArtillery',
    trigger: 'Weapons.HeavyArtillery',
  },
  { action: 'fireCannon', category: 'attack', sound: 'Attack/Cannon', trigger: 'Weapons.Cannon' },
  { action: 'fireRocket', category: 'attack', sound: 'Attack/Rocket', trigger: 'rocket hits' },
  {
    action: 'fireRocketLauncher',
    category: 'attack',
    sound: 'Attack/RocketLauncher',
    trigger: 'Weapons.RocketLauncher',
  },
  { action: 'fireRockets', category: 'attack', sound: 'Attack/Rockets', trigger: 'multi-rocket' },
  { action: 'fireSAM', category: 'attack', sound: 'Attack/SAM', trigger: 'Weapons.SAM launch' },
  { action: 'fireSAMImpact', category: 'attack', sound: 'Attack/SAMImpact', trigger: 'SAM detonation' },
  { action: 'fireBomb', category: 'attack', sound: 'Attack/Bomb', trigger: 'Weapons.Bomb' },
  {
    action: 'fireAirMissile',
    category: 'attack',
    sound: 'Attack/AirToAirMissile',
    trigger: 'air-to-air',
  },
  { action: 'fireTorpedo', category: 'attack', sound: 'Attack/Torpedo', trigger: 'naval torpedo' },
  {
    action: 'fireTorpedoImpact',
    category: 'attack',
    sound: 'Attack/TorpedoImpact',
    trigger: 'torpedo hit',
  },
  { action: 'fireRailgun', category: 'attack', sound: 'Attack/Railgun', trigger: 'Weapons.Railgun' },
  {
    action: 'fireRailgunImpact',
    category: 'attack',
    sound: 'Attack/RailgunImpact',
    trigger: 'railgun impact',
  },
  { action: 'fireFlamethrower', category: 'attack', sound: 'Attack/Flamethrower', trigger: 'flame' },
  { action: 'fireBite', category: 'attack', sound: 'Attack/Bite', trigger: 'melee bite' },
  { action: 'fireZombieBite', category: 'attack', sound: 'Attack/ZombieBite', trigger: 'zombie' },
  { action: 'fireClub', category: 'attack', sound: 'Attack/Club', trigger: 'club melee' },
  { action: 'firePow', category: 'attack', sound: 'Attack/Pow', trigger: 'punch impact' },
  { action: 'fireTentacle', category: 'attack', sound: 'Attack/TentacleWhip', trigger: 'tentacle' },

  // Unit actions
  { action: 'unitSpawn', category: 'unit', sound: 'Unit/Spawn', trigger: 'spawn animation' },
  { action: 'unitHeal', category: 'unit', sound: 'Unit/Heal', trigger: 'heal animation' },
  { action: 'unitSupply', category: 'unit', sound: 'Unit/Supply', trigger: 'resupply / poison tick' },
  { action: 'unitCapture', category: 'unit', sound: 'Unit/Capture', trigger: 'capture building' },
  { action: 'unitLoad', category: 'unit', sound: 'Unit/Load', trigger: 'transport load' },
  { action: 'unitDrop', category: 'unit', sound: 'Unit/Drop', trigger: 'transport drop' },
  { action: 'unitSabotage', category: 'unit', sound: 'Unit/Sabotage', trigger: 'sabotage' },
  { action: 'buildingCreate', category: 'building', sound: 'Building/Place', trigger: 'BuildingCreate' },
  { action: 'buildingCollapse', category: 'building', sound: 'Building/Collapse', trigger: 'Explosion building' },

  // Death / explosions
  { action: 'explodeInfantry', category: 'explosion', sound: 'Explosion/Infantry', trigger: 'unit death' },
  { action: 'explodeGround', category: 'explosion', sound: 'Explosion/Ground', trigger: 'land death' },
  { action: 'explodeAir', category: 'explosion', sound: 'Explosion/Air', trigger: 'air death' },
  { action: 'explodeNaval', category: 'explosion', sound: 'Explosion/Naval', trigger: 'naval death' },
  { action: 'explodeImpact', category: 'explosion', sound: 'ExplosionImpact', trigger: 'weapon impacts' },

  // Dialogue
  { action: 'talkMale', category: 'dialogue', sound: 'Talking/Low', trigger: 'CharacterMessage male' },
  { action: 'talkFemale', category: 'dialogue', sound: 'Talking/High', trigger: 'CharacterMessage female' },
  { action: 'talkOther', category: 'dialogue', sound: 'Talking/Mid', trigger: 'CharacterMessage other' },
];

export const movementActionBySound = Object.fromEntries(
  gameActionSounds
    .filter((entry) => entry.category === 'movement')
    .map((entry) => [entry.sound, entry.action]),
) as Partial<Record<SoundName, string>>;
