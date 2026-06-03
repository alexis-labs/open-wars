import {
  deleteSpriteOverride,
  listSpriteOverrides,
  setSpriteOverride,
  subscribeSpriteOverrides,
} from '@deities/art/SpriteOverrides.tsx';
import { spriteURL, updatePreparedSprite } from '@deities/art/Sprites.tsx';
import VariantConfiguration from '@deities/art/VariantConfiguration.tsx';
import { mapBuildings } from '@deities/athena/info/Building.tsx';
import { getAllDecorators } from '@deities/athena/info/Decorator.tsx';
import { SpriteVariant } from '@deities/athena/info/SpriteVariants.tsx';
import { mapUnits } from '@deities/athena/info/Unit.tsx';
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
  group: string;
  sprite: SpriteVariant;
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
const maxQuickSprites = 12;

const spriteEntries: ReadonlyArray<SpriteEntry> = [...VariantConfiguration]
  .map(([sprite, configuration]) => ({
    group: getSpriteGroup(sprite),
    sprite,
    variants: [...configuration.variantNames].sort((a, b) => a - b),
    waterSwap: !!configuration.waterSwap,
  }))
  .sort((a, b) => a.sprite.localeCompare(b.sprite));

const spriteGroups = ['All', ...new Set(spriteEntries.map(({ group }) => group))].sort((a, b) =>
  a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b),
);

function getSpriteGroup(sprite: SpriteVariant) {
  if (sprite.startsWith('Units-')) {
    return 'Units';
  }
  if (sprite.includes('Building')) {
    return 'Buildings';
  }
  return sprite;
}

function getResourceName(sprite: SpriteVariant, variant: number, biome: Biome | null) {
  return `${sprite}-${variant}${biome != null ? `-${biome}` : ''}`;
}

function getDefaultRegionSize(sprite: SpriteVariant): Dimensions {
  if (sprite === 'Portraits') {
    return { height: PortraitHeight, width: PortraitWidth };
  }
  if (sprite === 'Buildings' || sprite === 'Building-Create' || sprite.endsWith('Shadow')) {
    return { height: TileSize * 2, width: TileSize };
  }
  if (sprite.startsWith('Units-') || sprite.startsWith('Attack')) {
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
  sprite: SpriteVariant,
): ReadonlyArray<SpriteRegion> {
  const { height, width } = getDefaultRegionSize(sprite);
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

function createDefinedRegions(sprite: SpriteVariant, variant: number): ReadonlyArray<SpriteRegion> {
  const regions: Array<SpriteRegion> = [];

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
  const [selectedSprite, setSelectedSprite] = useState<SpriteVariant>(spriteEntries[0].sprite);
  const [selectedVariant, setSelectedVariant] = useState(spriteEntries[0].variants[0] || 0);
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
    () => spriteEntries.find(({ sprite }) => sprite === selectedSprite) || spriteEntries[0],
    [selectedSprite],
  );
  const selectedResourceBiome = selectedEntry.waterSwap ? selectedBiome : null;
  const resourceName = getResourceName(selectedSprite, selectedVariant, selectedResourceBiome);
  const hasOverride = overrideNames.has(resourceName);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return spriteEntries.filter(
      ({ group: entryGroup, sprite }) =>
        (group === 'All' || entryGroup === group) &&
        (!query || sprite.toLowerCase().includes(query)),
    );
  }, [group, search]);
  const quickEntries = filteredEntries.slice(0, maxQuickSprites);
  const definedRegions = useMemo(
    () => createDefinedRegions(selectedSprite, selectedVariant),
    [selectedSprite, selectedVariant],
  );
  const spriteRegions = useMemo(() => {
    if (!dimensions) {
      return definedRegions;
    }
    return definedRegions.length ? definedRegions : createGridRegions(dimensions, selectedSprite);
  }, [definedRegions, dimensions, selectedSprite]);
  const selectedRegion =
    spriteRegions.find(({ id }) => id === selectedRegionId) || spriteRegions[0] || null;

  const selectSprite = useCallback((sprite: SpriteVariant) => {
    const entry = spriteEntries.find((entry) => entry.sprite === sprite);
    setSelectedSprite(sprite);
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
          spriteURL(selectedSprite, selectedVariant, selectedResourceBiome ?? undefined),
        );
        setSelectedRegionId(null);
        setUndoStack([]);
        setHasUnsavedChanges(false);
        setMessage(hasOverride ? 'Loaded local override.' : 'Loaded original sprite sheet.');
      } catch (error) {
        setWorkingURL(null);
        setDimensions(null);
        setMessage(error instanceof Error ? error.message : 'Sprite sheet could not be loaded.');
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [hasOverride, hasSprites, selectedResourceBiome, selectedSprite, selectedVariant]);

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

  const importPNG = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
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
      await loadImage(dataURL);
      setWorkingURL(dataURL);
      setSelectedRegionId(null);
      setUndoStack([]);
      setHasUnsavedChanges(true);
      setMessage(`Imported ${file.name}. Save the override to use it in game.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Image could not be imported.');
    }
  }, []);

  const saveOverride = useCallback(() => {
    const canvas = sheetCanvasRef.current;
    if (!canvas) {
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
  }, [resourceName]);

  const clearOverride = useCallback(() => {
    if (!deleteSpriteOverride(resourceName)) {
      setMessage('No local override could be removed.');
      return;
    }

    updatePreparedSprite(resourceName);
    setOverrideNames(new Set(listSpriteOverrides()));
    setWorkingURL(spriteURL(selectedSprite, selectedVariant, selectedResourceBiome ?? undefined));
    setHasUnsavedChanges(false);
    setMessage(`Cleared local override for ${resourceName}.`);
  }, [resourceName, selectedResourceBiome, selectedSprite, selectedVariant]);

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
    setMessage('Applied the edited region to the sheet. Save the override to use it in game.');
  }, [selectedRegion]);

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
            <span>Sprite</span>
            <select
              onChange={(event) => selectSprite(event.currentTarget.value as SpriteVariant)}
              value={selectedSprite}
            >
              {filteredEntries.map(({ sprite }) => (
                <option key={sprite} value={sprite}>
                  {sprite}
                </option>
              ))}
            </select>
          </label>
          <p className={catalogMetaStyle}>
            Showing {filteredEntries.length} of {spriteEntries.length} sprites.
          </p>
          <div className={quickSpriteListStyle}>
            {quickEntries.map(({ sprite }) => (
              <button
                className={cx(spriteButtonStyle, sprite === selectedSprite && selectedSpriteStyle)}
                key={sprite}
                onClick={() => selectSprite(sprite)}
              >
                {sprite}
              </button>
            ))}
            {filteredEntries.length > quickEntries.length ? (
              <p className={catalogMetaStyle}>
                Use search or the Sprite dropdown for more results.
              </p>
            ) : null}
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

            <button className={actionButtonStyle} onClick={saveOverride}>
              Save Override
            </button>
            <button className={actionButtonStyle} onClick={exportSheet}>
              Export PNG
            </button>
            <button className={actionButtonStyle} disabled={!hasOverride} onClick={clearOverride}>
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
  display: grid;
  gap: 12px;
  max-height: calc(100vh - 112px);
  min-height: 0;
  overflow: hidden;
  padding: 16px;
  position: sticky;
  top: 72px;

  @media (max-width: 900px) {
    max-height: none;
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
  display: grid;
  gap: 6px;
  min-height: 0;
  overflow: auto;
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
