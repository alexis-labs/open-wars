import {
  deleteSpriteOverride,
  listSpriteOverrides,
  setSpriteOverride,
  subscribeSpriteOverrides,
} from '@deities/art/SpriteOverrides.tsx';
import { assetPath } from '@deities/art/AssetInfo.tsx';
import { spriteURL, updatePreparedSprite } from '@deities/art/Sprites.tsx';
import VariantConfiguration from '@deities/art/VariantConfiguration.tsx';
import { mapBuildings } from '@deities/athena/info/Building.tsx';
import { getAllDecorators } from '@deities/athena/info/Decorator.tsx';
import { SpriteVariant } from '@deities/athena/info/SpriteVariants.tsx';
import { mapTiles, RenderType } from '@deities/athena/info/Tile.tsx';
import { mapUnits } from '@deities/athena/info/Unit.tsx';
import { Modifier } from '@deities/athena/lib/Modifier.tsx';
import { Biome, Biomes, getBiomeName } from '@deities/athena/map/Biome.tsx';
import { TileSize } from '@deities/athena/map/Configuration.tsx';
import { css, cx } from '@emotion/css';
import {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PortraitHeight, PortraitWidth } from '../character/Portrait.tsx';
import { useSprites } from '../hooks/useSprites.tsx';

type SpriteEntry = Readonly<{
  canSave: boolean;
  group: string;
  id: string;
  label: string;
  regionSource: 'defined' | 'grid' | 'terrain';
  sprite?: SpriteVariant;
  staticURL?: string;
  variants: ReadonlyArray<number>;
  waterSwap: boolean;
}>;

type SpriteRegion = Readonly<{
  description?: string;
  height: number;
  id: string;
  label: string;
  width: number;
  x: number;
  y: number;
}>;

type Dimensions = Readonly<{
  height: number;
  width: number;
}>;

type Tool = 'eraser' | 'pencil';

const sheetZoom = 2;
const editorZoom = 16;
const unitSpriteSize = 32;
const maxUndoSteps = 20;

const spriteEntries: ReadonlyArray<SpriteEntry> = [...VariantConfiguration]
  .map(([sprite, configuration]) => ({
    canSave: true,
    group: getSpriteGroup(sprite),
    id: `sprite:${sprite}`,
    label: sprite,
    regionSource: 'defined' as const,
    sprite,
    variants: [...configuration.variantNames].sort((a, b) => a - b),
    waterSwap: !!configuration.waterSwap,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

const terrainEntries: ReadonlyArray<SpriteEntry> = [
  ['Tiles0', 'Grassland', 'assets/render/Tiles0.png'],
  ['Tiles1', 'Desert', 'assets/render/Tiles1.png'],
  ['Tiles2', 'Snow', 'assets/render/Tiles2.png'],
  ['Tiles3', 'Swamp', 'assets/render/Tiles3.png'],
  ['Tiles4', 'Spaceship', 'assets/render/Tiles4.png'],
  ['Tiles5', 'Volcano', 'assets/render/Tiles5.png'],
  ['Tiles6', 'Luna', 'assets/render/Tiles6.png'],
].map(([id, label, path]) => ({
  canSave: false,
  group: 'Terrain',
  id: `static:${id}`,
  label: `Terrain: ${label}`,
  regionSource: 'terrain',
  staticURL: assetPath(path),
  variants: [0],
  waterSwap: false,
}));

const staticEntries: ReadonlyArray<SpriteEntry> = [
  ['Crane', 'assets/Crane.png'],
  ['Cursor', 'assets/Cursor.png'],
  ['Damage', 'assets/Damage.png'],
  ['Delete', 'assets/Delete.png'],
  ['Explosion', 'assets/Explosion.png'],
  ['Heal', 'assets/Heal.png'],
  ['Poison', 'assets/Poison.png'],
  ['Sabotage', 'assets/Sabotage.png'],
  ['Shield', 'assets/Shield.png'],
  ['Structures', 'assets/Structures.png'],
  ['TileDecorators', 'assets/TileDecorators.png'],
  ['UnitIcons', 'assets/UnitIcons.png'],
  ['Upgrade', 'assets/Upgrade.png'],
].map(([id, path]) => ({
  canSave: false,
  group: 'Static',
  id: `static:${id}`,
  label: `Static: ${id}`,
  regionSource: 'grid',
  staticURL: assetPath(path),
  variants: [0],
  waterSwap: false,
}));

const sheetEntries: ReadonlyArray<SpriteEntry> = [
  ...spriteEntries,
  ...terrainEntries,
  ...staticEntries,
];

const priorityGroups = ['All', 'Units', 'Buildings', 'Portraits', 'Terrain', 'Static'];
const spriteGroups = [
  ...priorityGroups,
  ...[...new Set(sheetEntries.map(({ group }) => group))].filter(
    (group) => !priorityGroups.includes(group),
  ),
];

function getSpriteGroup(sprite: SpriteVariant) {
  if (sprite.startsWith('Units-')) {
    return 'Units';
  }
  if (sprite === 'Portraits') {
    return 'Portraits';
  }
  if (sprite.includes('Building')) {
    return 'Buildings';
  }
  return sprite;
}

function getResourceName(sprite: SpriteVariant, variant: number, biome: Biome | null) {
  return `${sprite}-${variant}${biome != null ? `-${biome}` : ''}`;
}

function getEntryResourceName(entry: SpriteEntry, variant: number, biome: Biome | null) {
  return entry.sprite ? getResourceName(entry.sprite, variant, biome) : entry.id.replace(':', '-');
}

function getDefaultRegionSize(entry: SpriteEntry): Dimensions {
  const { sprite } = entry;
  if (sprite === 'Portraits') {
    return { height: PortraitHeight, width: PortraitWidth };
  }
  if (sprite === 'Buildings' || sprite === 'Building-Create' || sprite?.endsWith('Shadow')) {
    return { height: TileSize * 2, width: TileSize };
  }
  if (sprite?.startsWith('Units-') || sprite?.startsWith('Attack')) {
    return { height: unitSpriteSize, width: unitSpriteSize };
  }
  return { height: TileSize, width: TileSize };
}

function addRegion(regions: Array<SpriteRegion>, region: SpriteRegion) {
  if (region.width > 0 && region.height > 0 && !regions.some(({ id }) => id === region.id)) {
    regions.push(region);
  }
}

function createGridRegions(
  dimensions: Dimensions,
  entry: SpriteEntry,
): ReadonlyArray<SpriteRegion> {
  const { height, width } = getDefaultRegionSize(entry);
  if (dimensions.width < width || dimensions.height < height) {
    return [];
  }

  const regions = [];
  for (let y = 0; y <= dimensions.height - height; y += height) {
    for (let x = 0; x <= dimensions.width - width; x += width) {
      regions.push({
        description: `${width}x${height} grid region at ${x}, ${y}.`,
        height,
        id: `grid-${x}-${y}-${width}-${height}`,
        label: `Grid ${x / width + 1}, ${y / height + 1}`,
        width,
        x,
        y,
      });
    }
  }
  return regions;
}

function isRegionInBounds(region: SpriteRegion, dimensions: Dimensions) {
  return (
    region.x >= 0 &&
    region.y >= 0 &&
    region.x + region.width <= dimensions.width &&
    region.y + region.height <= dimensions.height
  );
}

function getModifierName(modifier: Modifier) {
  return Modifier[modifier] || `Modifier ${modifier}`;
}

function addTileSourceRegion(
  regions: Array<SpriteRegion>,
  id: string,
  label: string,
  description: string,
  x: number,
  y: number,
  width = TileSize,
  height = TileSize,
) {
  addRegion(regions, {
    description: `${description} Source ${x}, ${y}; target ${width}x${height}.`,
    height,
    id,
    label: `${label} (${width}x${height})`,
    width,
    x,
    y,
  });
}

function addTileVectorRegion(
  regions: Array<SpriteRegion>,
  id: string,
  label: string,
  description: string,
  baseX: number,
  baseY: number,
  vector: Readonly<{ x: number; y: number }>,
  width = TileSize,
  height = TileSize,
) {
  addTileSourceRegion(
    regions,
    id,
    label,
    description,
    (baseX + vector.x) * TileSize,
    (baseY + vector.y) * TileSize,
    width,
    height,
  );
}

function createTerrainRegions(): ReadonlyArray<SpriteRegion> {
  const regions: Array<SpriteRegion> = [];

  mapTiles((tile) => {
    const baseX = tile.sprite.position.x;
    const baseY = tile.sprite.position.y;
    addTileVectorRegion(
      regions,
      `tile-${tile.id}-base`,
      `${tile.name}: base`,
      'Base tile region from TileInfo.sprite.position.',
      baseX,
      baseY,
      { x: 0, y: 0 },
    );

    const { animation } = tile.sprite;
    if (animation) {
      for (let frame = 1; frame < animation.frames; frame++) {
        addTileVectorRegion(
          regions,
          `tile-${tile.id}-animation-${frame}`,
          `${tile.name}: animation ${frame + 1}`,
          'Animated tile frame used by renderTile.',
          baseX,
          baseY,
          animation.horizontal ? { x: frame, y: 0 } : { x: 0, y: frame },
        );
      }
    }

    for (const [modifierId, rawModifier] of tile.sprite.modifiers) {
      const modifierName = getModifierName(modifierId);
      const modifier = rawModifier as
        | Readonly<{ x: number; y: number }>
        | ReadonlyArray<RenderType | Readonly<{ x: number; y: number }>>;
      const label = `${tile.name}: ${modifierName}`;
      const description = `Tile modifier ${modifierName} from TileInfo.sprite.modifiers.`;

      if (!Array.isArray(modifier)) {
        const vector = modifier as Readonly<{ x: number; y: number }>;
        addTileVectorRegion(
          regions,
          `tile-${tile.id}-${modifierName}`,
          label,
          description,
          baseX,
          baseY,
          vector,
        );
        continue;
      }

      if (modifier[0] === RenderType.Quarter) {
        for (const [index, part] of ['top-left', 'top-right', 'bottom-left', 'bottom-right'].entries()) {
          addTileVectorRegion(
            regions,
            `tile-${tile.id}-${modifierName}-${part}`,
            `${label}: ${part}`,
            description,
            baseX,
            baseY,
            modifier[index + 1] as Readonly<{ x: number; y: number }>,
            TileSize / 2,
            TileSize / 2,
          );
        }
      } else if (modifier[0] === RenderType.Horizontal) {
        for (const [index, part] of ['top half', 'bottom half'].entries()) {
          addTileVectorRegion(
            regions,
            `tile-${tile.id}-${modifierName}-${part}`,
            `${label}: ${part}`,
            description,
            baseX,
            baseY,
            modifier[index + 1] as Readonly<{ x: number; y: number }>,
            TileSize,
            TileSize / 2,
          );
        }
      } else if (modifier[0] === RenderType.Vertical) {
        for (const [index, part] of ['left half', 'right half'].entries()) {
          addTileVectorRegion(
            regions,
            `tile-${tile.id}-${modifierName}-${part}`,
            `${label}: ${part}`,
            description,
            baseX,
            baseY,
            modifier[index + 1] as Readonly<{ x: number; y: number }>,
            TileSize / 2,
            TileSize,
          );
        }
      } else if (modifier[0] === RenderType.Composite) {
        for (const [index, part] of ['base', 'overlay'].entries()) {
          addTileVectorRegion(
            regions,
            `tile-${tile.id}-${modifierName}-${part}`,
            `${label}: ${part}`,
            description,
            baseX,
            baseY,
            modifier[index + 1] as Readonly<{ x: number; y: number }>,
          );
        }
      }
    }
  });

  return regions.sort((a, b) => a.label.localeCompare(b.label));
}

function createDefinedRegions(entry: SpriteEntry, variant: number): ReadonlyArray<SpriteRegion> {
  const regions: Array<SpriteRegion> = [];
  const { sprite } = entry;

  if (entry.regionSource === 'terrain') {
    return createTerrainRegions();
  }

  if (!sprite) {
    return regions;
  }

  if (sprite === 'Buildings') {
    mapBuildings((building) => {
      if (building.sprite.name === sprite) {
        addRegion(regions, {
          description: `${building.sprite.size} building defined in BuildingInfo.`,
          height: TileSize * 2,
          id: `building-${building.id}`,
          label: building.name,
          width: TileSize,
          x: building.sprite.position.x * TileSize,
          y: building.sprite.position.y * TileSize,
        });
      }
    });
  }

  if (sprite === 'Decorators') {
    const biome = variant as Biome;
    for (const decorator of getAllDecorators()) {
      const biomeStyle = decorator.biomeStyle?.get(biome);
      addRegion(regions, {
        description: `Decorator #${decorator.id}.`,
        height: TileSize,
        id: `decorator-${decorator.id}-${biome}`,
        label: decorator.name,
        width: TileSize,
        x: (decorator.position.x + (biomeStyle?.x || 0)) * TileSize,
        y: (decorator.position.y + (biomeStyle?.y || 0)) * TileSize,
      });
    }
  }

  if (sprite === 'Portraits') {
    mapUnits((unit) => {
      const { position, variants } = unit.sprite.portrait;
      for (let variant = 0; variant < variants; variant++) {
        for (const pose of [0, 1]) {
          addRegion(regions, {
            description: pose ? 'Alternate animated portrait frame.' : 'Default portrait frame.',
            height: PortraitHeight,
            id: `portrait-${unit.id}-${variant}-${pose}`,
            label: `${unit.name}: portrait ${variant + 1}${pose ? ' alt' : ''}`,
            width: PortraitWidth,
            x: position.x * PortraitWidth,
            y: (position.y + variant + pose * 6) * PortraitHeight,
          });
        }
      }
    });
  }

  if (sprite.startsWith('Units-')) {
    mapUnits((unit) => {
      if (unit.sprite.name !== sprite) {
        return;
      }

      const addUnitRegion = (
        label: string,
        position: Readonly<{ x: number; y: number }> | undefined,
        options: Readonly<{ description?: string; frames?: number }> = {},
      ) => {
        if (!position) {
          return;
        }
        addRegion(regions, {
          description: options.description,
          height: unitSpriteSize,
          id: `unit-${unit.id}-${label}-${position.x}-${position.y}-${options.frames || 1}`,
          label: `${unit.name}: ${label}`,
          width: unitSpriteSize * (options.frames || 1),
          x: position.x * unitSpriteSize,
          y: position.y * unitSpriteSize,
        });
      };

      const { sprite: unitSprite } = unit;
      addUnitRegion('move frame', unitSprite.position, {
        description: 'Base moving frame from UnitInfo.sprite.position.',
      });
      addUnitRegion('idle frames', unitSprite.position.right(8), {
        description: 'Default idle animation frames used in game.',
        frames: 2,
      });
      addUnitRegion('down row', unitSprite.position.down(unitSprite.directionOffset), {
        description: 'Directional row for down-facing movement.',
      });
      addUnitRegion('up row', unitSprite.position.down(unitSprite.directionOffset * 2), {
        description: 'Directional row for up-facing movement.',
      });
      addUnitRegion('alternative', unitSprite.alternative);
      addUnitRegion('transport loaded', unitSprite.transports);
      addUnitRegion('transport full', unitSprite.transportsMany);
      addUnitRegion('unfolded', unitSprite.unfold);
      addUnitRegion('unfold animation', unitSprite.unfoldSprite?.position, {
        frames: unitSprite.unfoldSprite?.frames,
      });
      addUnitRegion('explosion', unitSprite.explosionSprite?.position, {
        frames: unitSprite.explosionSprite?.frames,
      });
      addUnitRegion('alternative explosion', unitSprite.alternativeExplosionSprite?.position, {
        frames: unitSprite.alternativeExplosionSprite?.frames,
      });
      addUnitRegion('heal', unitSprite.healSprite?.position, {
        frames: unitSprite.healSprite?.frames,
      });
    });
  }

  return regions.sort((a, b) => a.label.localeCompare(b.label));
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded.'));
    image.src = url;
  });
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Image could not be read.'));
      }
    };
    reader.onerror = () => reject(new Error('Image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function downloadPNG(name: string, dataURL: string) {
  const link = document.createElement('a');
  link.download = `${name}.png`;
  link.href = dataURL;
  link.click();
}

export default function SpriteEditor() {
  const hasSprites = useSprites('all');
  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const [group, setGroup] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(sheetEntries[0].id);
  const [selectedVariant, setSelectedVariant] = useState(sheetEntries[0].variants[0] || 0);
  const [selectedBiome, setSelectedBiome] = useState<Biome>(Biome.Grassland);
  const [workingURL, setWorkingURL] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#d33b2e');
  const [message, setMessage] = useState('Loading sprites...');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [undoStack, setUndoStack] = useState<ReadonlyArray<string>>([]);
  const [overrideNames, setOverrideNames] = useState(() => new Set(listSpriteOverrides()));

  const selectedEntry = useMemo(
    () => sheetEntries.find(({ id }) => id === selectedEntryId) || sheetEntries[0],
    [selectedEntryId],
  );
  const selectedResourceBiome = selectedEntry.waterSwap ? selectedBiome : null;
  const resourceName = getEntryResourceName(selectedEntry, selectedVariant, selectedResourceBiome);
  const hasOverride = selectedEntry.canSave && overrideNames.has(resourceName);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sheetEntries.filter(
      ({ group: entryGroup, label }) =>
        (group === 'All' || entryGroup === group) &&
        (!query || label.toLowerCase().includes(query)),
    );
  }, [group, search]);
  const definedRegions = useMemo(
    () => createDefinedRegions(selectedEntry, selectedVariant),
    [selectedEntry, selectedVariant],
  );
  const spriteRegions = useMemo(() => {
    if (!dimensions) {
      return definedRegions;
    }
    const regions = definedRegions.length ? definedRegions : createGridRegions(dimensions, selectedEntry);
    return regions.filter((region) => isRegionInBounds(region, dimensions));
  }, [definedRegions, dimensions, selectedEntry]);
  const selectedRegion =
    spriteRegions.find(({ id }) => id === selectedRegionId) || spriteRegions[0] || null;

  const selectEntry = useCallback((entryId: string) => {
    const entry = sheetEntries.find((entry) => entry.id === entryId) || sheetEntries[0];
    setSelectedEntryId(entry.id);
    setSelectedVariant(entry?.variants[0] || 0);
    setSelectedRegionId(null);
    setUndoStack([]);
  }, []);

  useEffect(
    () =>
      subscribeSpriteOverrides(() => {
        setOverrideNames(new Set(listSpriteOverrides()));
      }),
    [],
  );

  useEffect(() => {
    if (!hasSprites) {
      return;
    }

    let isCurrent = true;
    Promise.resolve().then(() => {
      if (!isCurrent) {
        return;
      }

      try {
        setWorkingURL(
          selectedEntry.sprite
            ? spriteURL(selectedEntry.sprite, selectedVariant, selectedResourceBiome ?? undefined)
            : selectedEntry.staticURL || null,
        );
        setSelectedRegionId(null);
        setUndoStack([]);
        setHasUnsavedChanges(false);
        setMessage(
          selectedEntry.canSave
            ? hasOverride
              ? 'Loaded local override.'
              : 'Loaded original sprite sheet.'
            : 'Loaded static renderer sheet. You can inspect, import, and export it, but local overrides do not affect the game yet.',
        );
      } catch (error) {
        setWorkingURL(null);
        setDimensions(null);
        setMessage(error instanceof Error ? error.message : 'Sprite sheet could not be loaded.');
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [hasOverride, hasSprites, selectedEntry, selectedResourceBiome, selectedVariant]);

  useEffect(() => {
    if (!workingURL) {
      return;
    }

    let isCurrent = true;
    loadImage(workingURL)
      .then((image) => {
        if (!isCurrent) {
          return;
        }

        const canvas = sheetCanvasRef.current;
        if (!canvas) {
          return;
        }

        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d')!;
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        setDimensions({ height: canvas.height, width: canvas.width });
      })
      .catch((error) => {
        if (isCurrent) {
          setMessage(error instanceof Error ? error.message : 'Sprite sheet could not be loaded.');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [workingURL]);

  const canEditRegion = !!selectedRegion;

  const drawSelectedRegion = useCallback(
    (region: SpriteRegion | null = selectedRegion) => {
      const cropCanvas = cropCanvasRef.current;
      const sheetCanvas = sheetCanvasRef.current;
      if (!cropCanvas || !sheetCanvas || !region) {
        return;
      }

      cropCanvas.width = region.width;
      cropCanvas.height = region.height;
      const context = cropCanvas.getContext('2d')!;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, region.width, region.height);
      context.drawImage(
        sheetCanvas,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        region.width,
        region.height,
      );
    },
    [selectedRegion],
  );

  useEffect(() => {
    drawSelectedRegion();
  }, [drawSelectedRegion, workingURL]);

  const selectRegion = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (!dimensions) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const imageX = Math.floor(((event.clientX - rect.left) / rect.width) * dimensions.width);
      const imageY = Math.floor(((event.clientY - rect.top) / rect.height) * dimensions.height);
      const region = spriteRegions.find(
        ({ height, width, x, y }) =>
          imageX >= x && imageX < x + width && imageY >= y && imageY < y + height,
      );
      if (!region) {
        return;
      }
      setSelectedRegionId(region.id);
      setUndoStack([]);
      window.requestAnimationFrame(() => drawSelectedRegion(region));
    },
    [dimensions, drawSelectedRegion, spriteRegions],
  );

  const importPNG = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) {
        return;
      }
      if (!file.type.startsWith('image/')) {
        setMessage('Choose a PNG or another browser-readable image file.');
        return;
      }

      try {
        const dataURL = await readImageFile(file);
        const image = await loadImage(dataURL);
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;

        if (dimensions && (width !== dimensions.width || height !== dimensions.height)) {
          setMessage(
            `Imported sheet is ${width}x${height}, but ${resourceName} is ${dimensions.width}x${dimensions.height}. Use Import Region to resize it into the selected region instead.`,
          );
          return;
        }

        setWorkingURL(dataURL);
        setSelectedRegionId(null);
        setUndoStack([]);
        setHasUnsavedChanges(true);
        setMessage(
          selectedEntry.canSave
            ? `Imported ${file.name}. Save the override to use it in game.`
            : `Imported ${file.name}. Static renderer sheets can be exported, but local overrides do not affect the game yet.`,
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Image could not be imported.');
      }
    },
    [dimensions, resourceName, selectedEntry.canSave],
  );

  const importRegion = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file || !selectedRegion) {
        return;
      }
      if (!file.type.startsWith('image/')) {
        setMessage('Choose a PNG or another browser-readable image file.');
        return;
      }

      try {
        const dataURL = await readImageFile(file);
        const image = await loadImage(dataURL);
        const cropCanvas = cropCanvasRef.current;
        if (!cropCanvas) {
          return;
        }

        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        try {
          const undoDataURL = cropCanvas.toDataURL('image/png');
          setUndoStack((stack) => [undoDataURL, ...stack].slice(0, maxUndoSteps));
        } catch {
          // Undo is best-effort for imported images.
        }
        cropCanvas.width = selectedRegion.width;
        cropCanvas.height = selectedRegion.height;
        const context = cropCanvas.getContext('2d')!;
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, selectedRegion.width, selectedRegion.height);
        context.drawImage(image, 0, 0, selectedRegion.width, selectedRegion.height);
        setMessage(
          `Imported ${file.name} and resized ${sourceWidth}x${sourceHeight} -> ${selectedRegion.width}x${selectedRegion.height}. Apply Region, then save the override.`,
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Image could not be imported.');
      }
    },
    [selectedRegion],
  );

  const saveOverride = useCallback(() => {
    const canvas = sheetCanvasRef.current;
    if (!canvas) {
      return;
    }
    if (!selectedEntry.canSave) {
      setMessage(
        'This static renderer sheet can be exported, but local overrides do not affect the game yet.',
      );
      return;
    }

    try {
      const dataURL = canvas.toDataURL('image/png');
      if (setSpriteOverride(resourceName, dataURL)) {
        updatePreparedSprite(resourceName, dataURL);
        setWorkingURL(dataURL);
        setOverrideNames(new Set(listSpriteOverrides()));
        setHasUnsavedChanges(false);
        setMessage(`Saved local override for ${resourceName}.`);
      } else {
        setMessage('Could not save the override. Browser storage may be unavailable or full.');
      }
    } catch {
      setMessage('Could not save this sheet. Import it as a local PNG first, then edit it.');
    }
  }, [resourceName, selectedEntry.canSave]);

  const clearOverride = useCallback(() => {
    if (!selectedEntry.canSave || !selectedEntry.sprite) {
      setMessage('This static renderer sheet does not have a local game override yet.');
      return;
    }
    if (!deleteSpriteOverride(resourceName)) {
      setMessage('No local override could be removed.');
      return;
    }

    updatePreparedSprite(resourceName);
    setOverrideNames(new Set(listSpriteOverrides()));
    setWorkingURL(spriteURL(selectedEntry.sprite, selectedVariant, selectedResourceBiome ?? undefined));
    setHasUnsavedChanges(false);
    setMessage(`Cleared local override for ${resourceName}.`);
  }, [resourceName, selectedEntry, selectedResourceBiome, selectedVariant]);

  const exportSheet = useCallback(() => {
    const canvas = sheetCanvasRef.current;
    if (!canvas) {
      return;
    }

    try {
      downloadPNG(resourceName, canvas.toDataURL('image/png'));
      setMessage(`Exported ${resourceName}.png.`);
    } catch {
      setMessage('Could not export this sheet. Import it as a local PNG first, then export it.');
    }
  }, [resourceName]);

  const pushUndoStep = useCallback(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas) {
      return;
    }

    try {
      const dataURL = canvas.toDataURL('image/png');
      setUndoStack((stack) => [dataURL, ...stack].slice(0, maxUndoSteps));
    } catch {
      // Remote sheets may be canvas-tainted; undo is best-effort in that case.
    }
  }, []);

  const paintPixel = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = cropCanvasRef.current;
      if (!canvas || (event.type === 'pointermove' && event.buttons !== 1)) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
      const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
      const context = canvas.getContext('2d')!;
      context.imageSmoothingEnabled = false;
      if (tool === 'eraser') {
        context.clearRect(x, y, 1, 1);
      } else {
        context.fillStyle = color;
        context.fillRect(x, y, 1, 1);
      }
    },
    [color, tool],
  );

  const undo = useCallback(() => {
    const [lastStep, ...rest] = undoStack;
    if (!lastStep) {
      return;
    }

    loadImage(lastStep).then((image) => {
      const canvas = cropCanvasRef.current;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext('2d')!;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      setUndoStack(rest);
    });
  }, [undoStack]);

  const applyRegionToSheet = useCallback(() => {
    const sheetCanvas = sheetCanvasRef.current;
    const cropCanvas = cropCanvasRef.current;
    if (!sheetCanvas || !cropCanvas || !selectedRegion) {
      return;
    }

    const context = sheetCanvas.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    context.clearRect(
      selectedRegion.x,
      selectedRegion.y,
      selectedRegion.width,
      selectedRegion.height,
    );
    context.drawImage(cropCanvas, selectedRegion.x, selectedRegion.y);
    setHasUnsavedChanges(true);
    setMessage(
      selectedEntry.canSave
        ? 'Applied the edited region to the sheet. Save the override to use it in game.'
        : 'Applied the edited region to the sheet. Export it as a PNG; static overrides are not wired into the game yet.',
    );
  }, [selectedEntry.canSave, selectedRegion]);

  const editorScale = selectedRegion
    ? Math.max(2, Math.min(editorZoom, Math.floor(420 / selectedRegion.width)))
    : editorZoom;
  const showRegionOverlays = spriteRegions.length > 0 && spriteRegions.length <= 250;

  const sheetStyle = dimensions
    ? {
        height: dimensions.height * sheetZoom,
        width: dimensions.width * sheetZoom,
      }
    : undefined;

  return (
    <section className={containerStyle}>
      <header className={headerStyle}>
        <div>
          <p className={eyebrowStyle}>Open Wars</p>
          <h1>Sprite Editor</h1>
          <p className={hintStyle}>
            Browse available sprite sheets, import replacements, edit defined regions, and save
            local overrides.
          </p>
        </div>
        <div className={statusPillStyle}>
          {hasOverride ? 'Local override active' : 'Original art'}
        </div>
      </header>

      <div className={layoutStyle}>
        <aside className={catalogStyle}>
          <label className={fieldStyle}>
            <span>Group</span>
            <select onChange={(event) => setGroup(event.currentTarget.value)} value={group}>
              {spriteGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldStyle}>
            <span>Search</span>
            <input
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Units-Pioneer"
              value={search}
            />
          </label>
          <label className={fieldStyle}>
            <span>Sheet</span>
            <select
              onChange={(event) => selectEntry(event.currentTarget.value)}
              value={selectedEntry.id}
            >
              {filteredEntries.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className={catalogMetaStyle}>
            Showing {filteredEntries.length} of {sheetEntries.length} sheets.
          </p>
          <div className={quickSpriteListStyle}>
            {filteredEntries.length ? (
              filteredEntries.map(({ id, label }) => (
                <button
                  className={cx(
                    spriteButtonStyle,
                    id === selectedEntry.id && selectedSpriteStyle,
                  )}
                  key={id}
                  onClick={() => selectEntry(id)}
                >
                  {label}
                </button>
              ))
            ) : (
              <p className={catalogMetaStyle}>No sprites match your search.</p>
            )}
          </div>
        </aside>

        <main className={editorStyle}>
          <div className={toolbarStyle}>
            <label className={fieldStyle}>
              <span>Variant</span>
              <select
                onChange={(event) => setSelectedVariant(Number(event.currentTarget.value))}
                value={selectedVariant}
              >
                {selectedEntry.variants.map((variant) => (
                  <option key={variant} value={variant}>
                    {variant}
                  </option>
                ))}
              </select>
            </label>

            {selectedEntry.waterSwap ? (
              <label className={fieldStyle}>
                <span>Biome</span>
                <select
                  onChange={(event) => setSelectedBiome(Number(event.currentTarget.value) as Biome)}
                  value={selectedBiome}
                >
                  {Biomes.map((biome) => (
                    <option key={biome} value={biome}>
                      {getBiomeName(biome)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className={fieldStyle}>
              <span>Region</span>
              <select
                disabled={!spriteRegions.length}
                onChange={(event) => {
                  setSelectedRegionId(event.currentTarget.value || null);
                  setUndoStack([]);
                }}
                value={selectedRegion?.id || ''}
              >
                {spriteRegions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.label} ({region.width}x{region.height})
                  </option>
                ))}
              </select>
            </label>

            <label className={cx(actionButtonStyle, fileButtonStyle)}>
              Import PNG
              <input accept="image/png,image/*" onChange={importPNG} type="file" />
            </label>

            <button className={actionButtonStyle} disabled={!selectedEntry.canSave} onClick={saveOverride}>
              Save Override
            </button>
            <button className={actionButtonStyle} onClick={exportSheet}>
              Export PNG
            </button>
            <button
              className={actionButtonStyle}
              disabled={!selectedEntry.canSave || !hasOverride}
              onClick={clearOverride}
            >
              Clear Override
            </button>
          </div>

          <p className={cx(messageStyle, hasUnsavedChanges && unsavedStyle)}>
            {hasUnsavedChanges ? 'Unsaved changes. ' : ''}
            {message}
          </p>
          <div className={detailsGridStyle}>
            <div>
              <strong>Sheet</strong>
              <span>{dimensions ? `${dimensions.width}x${dimensions.height}` : 'Loading'}</span>
            </div>
            <div>
              <strong>Regions</strong>
              <span>
                {definedRegions.length
                  ? `${definedRegions.length} from definitions`
                  : `${spriteRegions.length} grid regions`}
              </span>
            </div>
            <div>
              <strong>Selected</strong>
              <span>
                {selectedRegion
                  ? `${selectedRegion.label} at ${selectedRegion.x}, ${selectedRegion.y}`
                  : 'None'}
              </span>
            </div>
            <div>
              <strong>Target</strong>
              <span>
                {selectedRegion
                  ? `${selectedRegion.width}x${selectedRegion.height} pixels`
                  : 'None'}
              </span>
            </div>
            <div>
              <strong>Override</strong>
              <span>{selectedEntry.canSave ? 'Game override supported' : 'Export only'}</span>
            </div>
          </div>

          <div className={workspaceStyle}>
            <div className={sheetPanelStyle}>
              <h2>{resourceName}</h2>
              <div className={sheetViewportStyle}>
                <div className={sheetFrameStyle} style={sheetStyle}>
                  <canvas
                    className={cx(sheetCanvasStyle, canEditRegion && selectableCanvasStyle)}
                    onClick={selectRegion}
                    ref={sheetCanvasRef}
                    style={sheetStyle}
                  />
                  {showRegionOverlays
                    ? spriteRegions.map((region) => (
                        <div
                          className={regionOverlayStyle}
                          key={region.id}
                          style={{
                            height: region.height * sheetZoom,
                            left: region.x * sheetZoom,
                            top: region.y * sheetZoom,
                            width: region.width * sheetZoom,
                          }}
                        />
                      ))
                    : null}
                  {selectedRegion ? (
                    <div
                      className={selectedRegionOverlayStyle}
                      style={{
                        height: selectedRegion.height * sheetZoom,
                        left: selectedRegion.x * sheetZoom,
                        top: selectedRegion.y * sheetZoom,
                        width: selectedRegion.width * sheetZoom,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <aside className={pixelPanelStyle}>
              <h2>Pixel Editor</h2>
              {canEditRegion ? (
                <>
                  <p className={hintStyle}>
                    Edit the selected region, then apply it back to the sheet.{' '}
                    {selectedRegion?.description || ''}
                  </p>
                  <canvas
                    className={cx(pixelCanvasStyle, selectedRegion && selectableCanvasStyle)}
                    height={selectedRegion.height}
                    onPointerDown={(event) => {
                      if (!selectedRegion) {
                        return;
                      }
                      event.currentTarget.setPointerCapture(event.pointerId);
                      pushUndoStep();
                      paintPixel(event);
                    }}
                    onPointerMove={selectedRegion ? paintPixel : undefined}
                    ref={cropCanvasRef}
                    style={{
                      height: selectedRegion.height * editorScale,
                      width: selectedRegion.width * editorScale,
                    }}
                    width={selectedRegion.width}
                  />
                  <div className={toolGridStyle}>
                    <label className={fieldStyle}>
                      <span>Tool</span>
                      <select
                        onChange={(event) => setTool(event.currentTarget.value as Tool)}
                        value={tool}
                      >
                        <option value="pencil">Pencil</option>
                        <option value="eraser">Eraser</option>
                      </select>
                    </label>
                    <label className={fieldStyle}>
                      <span>Color</span>
                      <input
                        disabled={tool === 'eraser'}
                        onChange={(event) => setColor(event.currentTarget.value)}
                        type="color"
                        value={color}
                      />
                    </label>
                  </div>
                  <div className={buttonRowStyle}>
                    <label className={cx(actionButtonStyle, fileButtonStyle)}>
                      Import Region
                      <input accept="image/png,image/*" onChange={importRegion} type="file" />
                    </label>
                    <button
                      className={actionButtonStyle}
                      disabled={!undoStack.length}
                      onClick={undo}
                    >
                      Undo
                    </button>
                    <button
                      className={actionButtonStyle}
                      disabled={!selectedRegion}
                      onClick={applyRegionToSheet}
                    >
                      Apply Region
                    </button>
                  </div>
                </>
              ) : (
                <p className={hintStyle}>
                  No editable regions were found for this sheet. You can still import, save, export,
                  or clear a whole-sheet override.
                </p>
              )}
            </aside>
          </div>
        </main>
      </div>
    </section>
  );
}

const containerStyle = css`
  background: linear-gradient(135deg, #121926, #22364a 48%, #182533);
  color: #f7f8ef;
  min-height: 100%;
  padding: 72px 24px 32px;
`;

const headerStyle = css`
  align-items: start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin: 0 auto 24px;
  max-width: 1400px;

  h1 {
    font-family: Athena, ui-sans-serif, system-ui, sans-serif;
    font-size: clamp(36px, 6vw, 64px);
    line-height: 1;
    margin: 0;
  }
`;

const eyebrowStyle = css`
  color: #9eb8ca;
  font-family: Athena, ui-sans-serif, system-ui, sans-serif;
  font-size: 18px;
  margin: 0 0 6px;
  text-transform: uppercase;
`;

const hintStyle = css`
  color: #b9c8d4;
  line-height: 1.45;
  margin: 0;
`;

const statusPillStyle = css`
  background: rgba(249, 251, 243, 0.16);
  border: 1px solid rgba(249, 251, 243, 0.24);
  color: #f7f8ef;
  padding: 8px 12px;
  white-space: nowrap;
`;

const layoutStyle = css`
  align-items: start;
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  margin: 0 auto;
  max-width: 1400px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const panelCSS = `
  background: rgba(245, 247, 241, 0.1);
  border: 1px solid rgba(245, 247, 241, 0.16);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
`;

const catalogStyle = css`
  ${panelCSS}
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 104px);
  max-height: calc(100vh - 104px);
  min-height: 0;
  overflow: hidden;
  padding: 16px;
  position: sticky;
  top: 72px;

  @media (max-width: 900px) {
    height: auto;
    max-height: 60vh;
    position: static;
  }
`;

const fieldStyle = css`
  color: #dce6ed;
  display: grid;
  gap: 4px;
  font-size: 14px;

  input,
  select {
    background: rgba(249, 251, 243, 0.92);
    border: 0;
    color: #1f2933;
    font: inherit;
    min-height: 36px;
    padding: 6px 8px;
  }
`;

const catalogMetaStyle = css`
  color: #b9c8d4;
  font-size: 13px;
  line-height: 1.35;
  margin: 0;
`;

const quickSpriteListStyle = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
`;

const spriteButtonStyle = css`
  background: rgba(249, 251, 243, 0.84);
  border: 0;
  color: #1f2933;
  cursor: pointer;
  font: inherit;
  min-height: 36px;
  padding: 6px 8px;
  text-align: left;

  &:hover {
    background: #fff;
    color: #0c6fa5;
  }
`;

const selectedSpriteStyle = css`
  background: #ffffff;
  color: #0c6fa5;
`;

const editorStyle = css`
  display: grid;
  gap: 16px;
  min-width: 0;
`;

const toolbarStyle = css`
  ${panelCSS}
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
`;

const actionButtonStyle = css`
  background: #f9fbf3;
  border: 0;
  color: #1f2933;
  cursor: pointer;
  font: inherit;
  min-height: 36px;
  padding: 7px 12px;

  &:hover:not(:disabled) {
    background: #ffffff;
    color: #0c6fa5;
  }

  &:disabled {
    cursor: default;
    opacity: 0.45;
  }
`;

const fileButtonStyle = css`
  align-items: center;
  display: inline-flex;
  overflow: hidden;
  position: relative;

  input {
    cursor: pointer;
    inset: 0;
    opacity: 0;
    position: absolute;
  }
`;

const messageStyle = css`
  ${panelCSS}
  color: #dce6ed;
  margin: 0;
  padding: 12px 16px;
`;

const unsavedStyle = css`
  color: #ffe3a3;
`;

const detailsGridStyle = css`
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  div {
    ${panelCSS}
    display: grid;
    gap: 3px;
    padding: 10px 12px;
  }

  strong {
    color: #f7f8ef;
    font-size: 13px;
  }

  span {
    color: #b9c8d4;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const workspaceStyle = css`
  align-items: start;
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const sheetPanelStyle = css`
  ${panelCSS}
  min-width: 0;
  padding: 16px;

  h2 {
    font-size: 18px;
    margin: 0 0 12px;
    overflow-wrap: anywhere;
  }
`;

const sheetViewportStyle = css`
  background: rgba(0, 0, 0, 0.22);
  overflow: auto;
  padding: 12px;
`;

const sheetFrameStyle = css`
  display: inline-block;
  image-rendering: pixelated;
  position: relative;
`;

const sheetCanvasStyle = css`
  display: block;
  image-rendering: pixelated;
`;

const selectableCanvasStyle = css`
  cursor: crosshair;
`;

const regionOverlayStyle = css`
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
  pointer-events: none;
  position: absolute;
`;

const selectedRegionOverlayStyle = css`
  box-shadow:
    inset 0 0 0 2px #f9fbf3,
    0 0 0 2px #0c6fa5;
  pointer-events: none;
  position: absolute;
`;

const pixelPanelStyle = css`
  ${panelCSS}
  display: grid;
  gap: 14px;
  padding: 16px;

  h2 {
    font-size: 18px;
    margin: 0;
  }
`;

const pixelCanvasStyle = css`
  background:
    linear-gradient(45deg, #d5d8dc 25%, transparent 25%),
    linear-gradient(-45deg, #d5d8dc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d5d8dc 75%),
    linear-gradient(-45deg, transparent 75%, #d5d8dc 75%), #f9fbf3;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
  border: 1px solid rgba(255, 255, 255, 0.34);
  image-rendering: pixelated;
  max-width: 100%;
`;

const toolGridStyle = css`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
`;

const buttonRowStyle = css`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
