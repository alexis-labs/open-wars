import { decodeEffects, type Effects, encodeEffects } from '@deities/apollo/Effects.tsx';
import dateNow from '@deities/apollo/lib/dateNow.tsx';
import mapWithAIPlayers from '@deities/apollo/lib/mapWithAIPlayers.tsx';
import toSlug from '@deities/apollo/lib/toSlug.tsx';
import { prepareSprites } from '@deities/art/Sprites.tsx';
import { Pioneer } from '@deities/athena/info/Unit.tsx';
import startGame from '@deities/athena/lib/startGame.tsx';
import MapData from '@deities/athena/MapData.tsx';
import { MusicContext, useBiomeMusic, usePlayMusic } from '@deities/hera/audio/Music.tsx';
import MapEditor from '@deities/hera/editor/MapEditor.tsx';
import SpriteEditor from '@deities/hera/editor/SpriteEditor.tsx';
import {
  type MapCreateFunction,
  type MapObject,
  type MapUpdateFunction,
} from '@deities/hera/editor/Types.tsx';
import GameMap from '@deities/hera/GameMap.tsx';
import useClientGameAction from '@deities/hera/hooks/useClientGameAction.tsx';
import useClientGamePlayerDetails from '@deities/hera/hooks/useClientGamePlayerDetails.tsx';
import { HideContext } from '@deities/hera/hooks/useHide.tsx';
import { type UserWithUnlocks } from '@deities/hera/hooks/useUserMap.tsx';
import LocaleContext from '@deities/hera/i18n/LocaleContext.tsx';
import GameActions from '@deities/hera/ui/GameActions.tsx';
import MapInfo from '@deities/hera/ui/MapInfo.tsx';
import type { ClientGame } from '@deities/hermes/game/toClientGame.tsx';
import undoClientGame, { type UndoType } from '@deities/hermes/game/undo.tsx';
import AudioPlayer from '@deities/ui/AudioPlayer.tsx';
import setupGamePad from '@deities/ui/controls/setupGamePad.tsx';
import setupHidePointer from '@deities/ui/controls/setupHidePointer.tsx';
import setupKeyboard from '@deities/ui/controls/setupKeyboard.tsx';
import { getScopedCSSDefinitions } from '@deities/ui/CSS.tsx';
import cssVar, { applyVar, initializeCSSVariables } from '@deities/ui/cssVar.tsx';
import { AlertContext } from '@deities/ui/hooks/useAlert.tsx';
import useScale, { ScaleContext } from '@deities/ui/hooks/useScale.tsx';
import { setDefaultPortalContainer } from '@deities/ui/Portal.tsx';
import ScrollContainer from '@deities/ui/ScrollContainer.tsx';
import Spinner from '@deities/ui/Spinner.tsx';
import { css, cx, injectGlobal } from '@emotion/css';
import { VisibilityStateContext } from '@nkzw/use-visibility-state';
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { campaign1TutorialVersion, ensureCampaign1TutorialMap } from './campaign1Map.tsx';
import { isOfficialCampaignMap } from './campaignCatalog.tsx';
import CampaignMenu from './CampaignMenu.tsx';
import createQuickPlaySkirmish from './createQuickPlaySkirmish.tsx';
import { persistMapToProject } from './persistMapToProject.ts';
import {
  advancePastNonBattleNode,
  advanceRunAfterReward,
  applyReward,
  applyRunPlayerBonuses,
  applyRunPlayerIdentity,
  createInitialRoguelikeRun,
  createRoguelikeCampaignBattle,
  describeRunUnlocks,
  formatNodeType,
  generateRewardChoices,
  isBattleNode,
  normalizeMetaProgression,
  normalizeRunState,
  recordRunFinished,
  resolveNonBattleNode,
  type RewardCard,
  type RoguelikeMetaProgression,
  type RoguelikeRunState,
} from './roguelikeCampaign.tsx';
import { getDefaultTutorialMap, needsOfficialCampaignReseed } from './tutorial/seed.tsx';

const campaign1TutorialVersionKey = '::OpenWars::campaign-1-tutorial-version';

type Screen = 'campaign' | 'mapEditor' | 'menu' | 'options' | 'playing' | 'spriteEditor';

type ErrorBoundaryState = Readonly<{
  error: Error | null;
}>;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<Readonly<{ outcome: 'accepted' | 'dismissed'; platform: string }>>;
};

const appUpdateAvailableEvent = 'open-wars:update-available';
const savedEditorMapKey = '::OpenWars::editor-map';
const fullscreenPreferenceKey = '::OpenWars::fullscreen';
const savedGameKey = '::OpenWars::saved-game';
const savedGameVersion = 1;
const savedRoguelikeMetaKey = '::OpenWars::roguelike-meta';
const savedRoguelikeRunKey = '::OpenWars::roguelike-run';
const soundPreferenceKey = '::OpenWars::sound-enabled';
const campaignCompletedMapsKey = '::OpenWars::campaign-completed-maps';

type SavedGame = Readonly<{
  effects?: ReturnType<typeof encodeEffects>;
  map: ReturnType<MapData['toJSON']>;
  savedAt: number;
  version: typeof savedGameVersion;
}>;

type LoadedSavedGame = Readonly<{
  effects: Effects | null;
  map: MapData;
}>;

type EditorMapLibrary = Readonly<{
  current: MapObject | null;
  maps: ReadonlyArray<MapObject>;
}>;

const startAction = {
  type: 'Start',
} as const;

const localPlayer = {
  biomes: [],
  character: {
    color: 1,
    unitId: Pioneer.id,
    variant: 0,
  },
  displayName: 'Commander',
  equippedUnitCustomizations: [],
  factionName: 'Open Wars',
  id: 'open-wars-local-player',
  skills: [],
  unlockedSkillSlots: [1],
  username: 'commander',
} satisfies UserWithUnlocks;

const localMapCreator = {
  displayName: localPlayer.displayName,
  id: localPlayer.id,
  username: localPlayer.username,
};

function isSoundPreferenceEnabled() {
  return localStorage.getItem(soundPreferenceKey) !== '0';
}

function enableAudioFromUserGesture(sound: 'UI/Accept' | 'UI/Cancel' | 'UI/Start' = 'UI/Accept') {
  if (isSoundPreferenceEnabled()) {
    AudioPlayer.resume();
    AudioPlayer.playSound(sound);
  }
}

initializeCSSVariables();
injectGlobal(`
  :root {
    ${cssVar('safe-area-bottom', 'env(safe-area-inset-bottom, 0px)')}
    ${cssVar('safe-area-top', 'env(safe-area-inset-top, 0px)')}
  }

  #root {
    min-height: 100vh;
    position: relative;
    z-index: 1;
  }
`);

const portal = document.createElement('div');
portal.classList.add('portal');
portal.style.position = 'relative';
portal.style.zIndex = '15';
document.body.append(portal);
setDefaultPortalContainer(portal);

AudioPlayer.preload();
if (isSoundPreferenceEnabled()) {
  AudioPlayer.resume();
} else {
  AudioPlayer.pause();
}
setupGamePad();
setupHidePointer();
setupKeyboard();
registerServiceWorker();

function RootScope({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <MusicContext>
        <LocaleContext>
          <ScaleContext>
            <VisibilityStateContext>
              <HideContext>
                <AlertContext>
                  <div className={appScope}>{children}</div>
                </AlertContext>
              </HideContext>
            </VisibilityStateContext>
          </ScaleContext>
        </LocaleContext>
      </MusicContext>
    </MemoryRouter>
  );
}

class ProductionErrorBoundary extends Component<
  Readonly<{ children: ReactNode }>,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // oxlint-disable-next-line no-console
    console.error('Open Wars crashed', error, info);
  }

  override render() {
    const { error } = this.state;

    if (error) {
      return (
        <main className={errorScreen}>
          <section className={menuCard}>
            <p className={eyebrow}>Open Wars</p>
            <h1 className={title}>Something went wrong</h1>
            <p className={statusMessage}>
              The game hit an unexpected error. Reloading usually restores the local session.
            </p>
            <button className={menuButton} onClick={() => window.location.reload()}>
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function OpenWarsApp() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [savedMap, setSavedMap] = useState<MapData | null>(null);
  const [savedEffects, setSavedEffects] = useState<Effects | null>(null);
  const [shouldStartSavedMap, setShouldStartSavedMap] = useState(false);
  const [editorMapLibrary, setEditorMapLibrary] =
    useState<EditorMapLibrary>(loadSavedEditorMapLibrary);
  const [editorSessionKey, setEditorSessionKey] = useState(0);
  const [hasSavedGame, setHasSavedGame] = useState(
    () => localStorage.getItem(savedGameKey) != null,
  );
  const [isSoundEnabled, setSoundEnabled] = useState(isSoundPreferenceEnabled);
  const [wantsFullscreen, setWantsFullscreen] = useState(
    () => localStorage.getItem(fullscreenPreferenceKey) === '1',
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hasAppUpdate, setHasAppUpdate] = useState(false);
  const [exitMessage, setExitMessage] = useState<string | null>(null);
  const [fullscreenMessage, setFullscreenMessage] = useState<string | null>(null);
  const [activeCampaignMapId, setActiveCampaignMapId] = useState<string | null>(null);
  const [completedCampaignMapIds, setCompletedCampaignMapIds] = useState(() =>
    loadCompletedCampaignMapIds(),
  );
  const [roguelikeMeta, setRoguelikeMeta] = useState(loadRoguelikeMeta);
  const [roguelikeRun, setRoguelikeRun] = useState<RoguelikeRunState | null>(loadRoguelikeRun);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    prepareSprites()
      .catch(() => {})
      .finally(() => setIsBooting(false));
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const onAppUpdateAvailable = () => setHasAppUpdate(true);
    window.addEventListener(appUpdateAvailableEvent, onAppUpdateAvailable);
    return () => window.removeEventListener(appUpdateAvailableEvent, onAppUpdateAvailable);
  }, []);

  const startNewGame = useCallback(() => {
    enableAudioFromUserGesture('UI/Start');
    setExitMessage(null);
    setFullscreenMessage(null);
    const run = createInitialRoguelikeRun(roguelikeMeta);
    setSavedMap(null);
    setSavedEffects(null);
    setShouldStartSavedMap(false);
    setActiveCampaignMapId(null);
    setRoguelikeRun(run);
    saveRoguelikeRun(run);
    setHasSavedGame(false);
    localStorage.removeItem(savedGameKey);
    setScreen('playing');
  }, [roguelikeMeta]);

  const continueGame = useCallback(() => {
    enableAudioFromUserGesture('UI/Start');
    setExitMessage(null);
    setFullscreenMessage(null);

    const savedGame = loadSavedGame();
    if (savedGame) {
      setRoguelikeRun(loadRoguelikeRun());
      setSavedMap(savedGame.map);
      setSavedEffects(savedGame.effects);
      setShouldStartSavedMap(false);
      setActiveCampaignMapId(null);
      setHasSavedGame(true);
      setScreen('playing');
    } else {
      setHasSavedGame(false);
      localStorage.removeItem(savedGameKey);
    }
  }, []);

  const deleteSave = useCallback(() => {
    enableAudioFromUserGesture('UI/Cancel');
    setExitMessage(null);
    setSavedMap(null);
    setSavedEffects(null);
    setShouldStartSavedMap(false);
    setRoguelikeRun(null);
    setHasSavedGame(false);
    localStorage.removeItem(savedGameKey);
    localStorage.removeItem(savedRoguelikeRunKey);
  }, []);

  const openMapEditor = useCallback(() => {
    enableAudioFromUserGesture();
    setExitMessage(null);
    setFullscreenMessage(null);
    setScreen('mapEditor');
  }, []);

  const openSpriteEditor = useCallback(() => {
    enableAudioFromUserGesture();
    setExitMessage(null);
    setFullscreenMessage(null);
    setScreen('spriteEditor');
  }, []);

  const openCampaign = useCallback(() => {
    enableAudioFromUserGesture();
    setExitMessage(null);
    setFullscreenMessage(null);
    setScreen('campaign');
  }, []);

  const markCampaignMapCompleted = useCallback((mapId: string) => {
    setCompletedCampaignMapIds((completed) => {
      if (completed.has(mapId)) {
        return completed;
      }

      const next = new Set([...completed, mapId]);
      saveCompletedCampaignMapIds(next);
      return next;
    });
  }, []);

  const playCampaignMap = useCallback((mapObject: MapObject) => {
    enableAudioFromUserGesture('UI/Start');
    setExitMessage(null);
    setFullscreenMessage(null);

    try {
      const map = MapData.fromJSON(mapObject.state);
      if (!map) {
        return;
      }

      setSavedMap(map);
      setSavedEffects(decodeEditorEffects(mapObject.effects));
      setShouldStartSavedMap(true);
      setActiveCampaignMapId(mapObject.id);
      setScreen('playing');
    } catch {
      setEditorMapLibrary((library) => {
        const maps = library.maps.filter(({ id }) => id !== mapObject.id);
        saveEditorMapObjects(maps);
        return {
          current: library.current?.id === mapObject.id ? maps[0] || null : library.current,
          maps,
        };
      });
      setExitMessage('That created map could not be loaded.');
    }
  }, []);

  const openOptions = useCallback(() => {
    enableAudioFromUserGesture();
    setExitMessage(null);
    setFullscreenMessage(null);
    setScreen('options');
  }, []);

  const backToMenu = useCallback(() => {
    enableAudioFromUserGesture('UI/Cancel');
    setFullscreenMessage(null);
    setActiveCampaignMapId(null);
    setScreen('menu');
  }, []);

  const markSaved = useCallback(() => {
    setHasSavedGame(true);
  }, []);

  const updateRoguelikeRun = useCallback((run: RoguelikeRunState) => {
    setRoguelikeRun(run);
    saveRoguelikeRun(run);
  }, []);

  const finishRoguelikeRun = useCallback(
    (run: RoguelikeRunState, didWin: boolean) => {
      const nextMeta = recordRunFinished(roguelikeMeta, run, didWin);
      setRoguelikeMeta(nextMeta);
      saveRoguelikeMeta(nextMeta);
      setRoguelikeRun(null);
      setSavedMap(null);
      setSavedEffects(null);
      setShouldStartSavedMap(false);
      setHasSavedGame(false);
      localStorage.removeItem(savedGameKey);
      localStorage.removeItem(savedRoguelikeRunKey);
      setExitMessage(
        didWin
          ? `Run complete. Meta level ${nextMeta.level}, ${nextMeta.experience} XP.`
          : `Run ended at battle ${run.battle}. Meta level ${nextMeta.level}, ${nextMeta.experience} XP.`,
      );
      setScreen('menu');
    },
    [roguelikeMeta],
  );

  const exit = useCallback(() => {
    setExitMessage(null);
    window.close();
    window.setTimeout(() => {
      setExitMessage('Your browser blocked closing this tab. You can close it manually.');
    }, 250);
  }, []);

  const toggleSound = useCallback(() => {
    if (AudioPlayer.isPaused()) {
      localStorage.setItem(soundPreferenceKey, '1');
      AudioPlayer.resume();
      AudioPlayer.playSound('UI/Accept');
      setSoundEnabled(true);
    } else {
      AudioPlayer.playSound('UI/Cancel');
      localStorage.setItem(soundPreferenceKey, '0');
      AudioPlayer.pause();
      setSoundEnabled(false);
    }
  }, []);

  const installApp = useCallback(async () => {
    const prompt = installPrompt;
    if (!prompt) {
      return;
    }

    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }, [installPrompt]);

  const updateApp = useCallback(() => {
    navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }, []);

  const toggleFullscreen = useCallback(() => {
    setFullscreenMessage(null);

    if (!document.fullscreenEnabled) {
      setFullscreenMessage('Fullscreen is not available in this browser.');
      return;
    }

    const shouldEnterFullscreen = !document.fullscreenElement;
    const nextState = shouldEnterFullscreen
      ? document.documentElement.requestFullscreen()
      : document.exitFullscreen();

    nextState
      .then(() => {
        setWantsFullscreen(shouldEnterFullscreen);
        if (shouldEnterFullscreen) {
          localStorage.setItem(fullscreenPreferenceKey, '1');
        } else {
          localStorage.removeItem(fullscreenPreferenceKey);
        }
      })
      .catch(() => {
        setFullscreenMessage('Fullscreen could not be changed.');
      });
  }, []);

  const saveCreatedMap = useCallback(
    (mapObject: MapObject, setSaveState?: Parameters<MapCreateFunction>[1]) => {
      const maps = upsertEditorMapObject(editorMapLibrary.maps, mapObject);
      if (!saveEditorMapObjects(maps, setSaveState)) {
        return;
      }

      setEditorMapLibrary({
        current: mapObject,
        maps,
      });

      if (!import.meta.env.DEV || !isOfficialCampaignMap(mapObject)) {
        return;
      }

      void persistMapToProject(mapObject).then((result) => {
        if (result.ok) {
          setSaveState?.({
            message: 'Saved to browser and project (missions.tsx).',
          });
        } else if (result.error) {
          setSaveState?.({
            message: `Saved in browser. ${result.error}`,
          });
        }
      });
    },
    [editorMapLibrary.maps],
  );

  const createEditorMap = useCallback<MapCreateFunction>(
    (variables, setSaveState) => {
      if (isEditorMapNameTaken(editorMapLibrary.maps, variables.mapName)) {
        setSaveState({ id: 'name-exists' });
        return;
      }
      saveCreatedMap(createEditorMapObject(variables), setSaveState);
    },
    [editorMapLibrary.maps, saveCreatedMap],
  );

  const updateEditorMap = useCallback<MapUpdateFunction>(
    (variables, _type, setSaveState) => {
      if (isEditorMapNameTaken(editorMapLibrary.maps, variables.mapName, variables.id)) {
        setSaveState({ id: 'name-exists' });
        return;
      }
      saveCreatedMap(createEditorMapObject(variables, variables.id), setSaveState);
    },
    [editorMapLibrary.maps, saveCreatedMap],
  );

  const selectEditorMap = useCallback((id: string) => {
    setEditorMapLibrary((library) => {
      const current = library.maps.find((mapObject) => mapObject.id === id);
      return current ? { ...library, current } : library;
    });
  }, []);

  const createNewEditorMap = useCallback(() => {
    setEditorMapLibrary((library) => ({
      ...library,
      current: null,
    }));
    setEditorSessionKey((key) => key + 1);
  }, []);

  const deleteEditorMap = useCallback((id: string) => {
    setEditorMapLibrary((library) => {
      const maps = library.maps.filter((mapObject) => mapObject.id !== id);
      saveEditorMapObjects(maps);
      return {
        current: library.current?.id === id ? maps[0] || null : library.current,
        maps,
      };
    });
    setEditorSessionKey((key) => key + 1);
  }, []);

  if (isBooting) {
    return (
      <main className={bootScreen}>
        <Spinner />
      </main>
    );
  }

  if (screen === 'playing') {
    return (
      <LocalSkirmish
        campaignMapId={activeCampaignMapId}
        initialEffects={savedEffects}
        initialSavedMap={savedMap}
        onCampaignVictory={markCampaignMapCompleted}
        onExitToMenu={backToMenu}
        onRoguelikeRunFinished={finishRoguelikeRun}
        onRoguelikeRunUpdate={updateRoguelikeRun}
        onSaved={markSaved}
        roguelikeRun={roguelikeRun}
        shouldStartInitialMap={shouldStartSavedMap}
      />
    );
  }

  if (screen === 'mapEditor') {
    return (
      <LocalMapEditor
        createMap={createEditorMap}
        editorSessionKey={editorSessionKey}
        mapObject={editorMapLibrary.current}
        mapObjects={editorMapLibrary.maps}
        onDeleteMap={deleteEditorMap}
        onExitToMenu={backToMenu}
        onNewMap={createNewEditorMap}
        onSelectMap={selectEditorMap}
        updateMap={updateEditorMap}
      />
    );
  }

  if (screen === 'spriteEditor') {
    return <LocalSpriteEditor onExitToMenu={backToMenu} />;
  }

  if (screen === 'campaign') {
    return (
      <CampaignMenu
        completedMapIds={completedCampaignMapIds}
        maps={editorMapLibrary.maps}
        onBack={backToMenu}
        onPlayMission={playCampaignMap}
      />
    );
  }

  return (
    <main className={menuScreen}>
      <section className={menuCard}>
        <p className={eyebrow}>Open Wars</p>
        <h1 className={title}>{screen === 'options' ? 'Options' : 'Main Menu'}</h1>

        {screen === 'options' ? (
          <>
            <div className={optionList}>
              <div className={optionRow}>
                <span>Sound</span>
                <button className={cx(menuButton, smallButton)} onClick={toggleSound}>
                  {isSoundEnabled ? 'On' : 'Off'}
                </button>
              </div>
              <div className={optionRow}>
                <span>Fullscreen</span>
                <button className={cx(menuButton, smallButton)} onClick={toggleFullscreen}>
                  {wantsFullscreen ? 'On' : 'Off'}
                </button>
              </div>
            </div>
            {fullscreenMessage ? <p className={statusMessage}>{fullscreenMessage}</p> : null}
            <button className={menuButton} onClick={backToMenu}>
              Back
            </button>
          </>
        ) : (
          <>
            <div className={buttonStack}>
              <button className={menuButton} onClick={openSpriteEditor}>
                Sprite Editor
              </button>
              <p className={menuHint}>Edit available sprite sheets and local replacements.</p>
              <button className={menuButton} onClick={startNewGame}>
                Roguelike Campaign
              </button>
              <p className={menuHint}>
                Level {roguelikeMeta.level} - best battle {roguelikeMeta.bestBattle}
              </p>
              <button className={menuButton} onClick={openCampaign}>
                Campaign
              </button>
              <button className={menuButton} onClick={openMapEditor}>
                Map editor
              </button>
              <p className={menuHint}>Create maps with objectives and story events.</p>
              <button className={menuButton} onClick={openOptions}>
                Options
              </button>
              <button className={cx(menuButton, exitButton)} onClick={exit}>
                Exit
              </button>
            </div>
            {hasSavedGame || installPrompt || hasAppUpdate ? (
              <div className={secondaryActions}>
                {hasSavedGame ? (
                  <button className={secondaryButton} onClick={continueGame}>
                    Continue
                  </button>
                ) : null}
                {hasSavedGame ? (
                  <button className={cx(secondaryButton, dangerButton)} onClick={deleteSave}>
                    Delete Save
                  </button>
                ) : null}
                {installPrompt ? (
                  <button className={secondaryButton} onClick={installApp}>
                    Install App
                  </button>
                ) : null}
                {hasAppUpdate ? (
                  <button className={secondaryButton} onClick={updateApp}>
                    Update App
                  </button>
                ) : null}
              </div>
            ) : null}
            {exitMessage ? <p className={statusMessage}>{exitMessage}</p> : null}
          </>
        )}
      </section>
    </main>
  );
}

function LocalSkirmish({
  campaignMapId,
  initialEffects,
  initialSavedMap,
  onCampaignVictory,
  onExitToMenu,
  onRoguelikeRunFinished,
  onRoguelikeRunUpdate,
  onSaved,
  roguelikeRun,
  shouldStartInitialMap,
}: {
  campaignMapId: string | null;
  initialEffects: Effects | null;
  initialSavedMap: MapData | null;
  onCampaignVictory?: (mapId: string) => void;
  onExitToMenu: () => void;
  onRoguelikeRunFinished: (run: RoguelikeRunState, didWin: boolean) => void;
  onRoguelikeRunUpdate: (run: RoguelikeRunState) => void;
  onSaved: () => void;
  roguelikeRun: RoguelikeRunState | null;
  shouldStartInitialMap: boolean;
}) {
  const [renderKey, setRenderKey] = useState(0);
  const zoom = useScale();
  const gameScale = useResponsiveGameScale(zoom);
  const [map, metadata] = useMemo(
    () =>
      initialSavedMap
        ? [initialSavedMap, null]
        : roguelikeRun
          ? createRoguelikeCampaignBattle(roguelikeRun)
          : createQuickPlaySkirmish(),
    [initialSavedMap, roguelikeRun],
  );
  const [game, setGame] = useState<ClientGame>(() =>
    createLocalClientGame(
      initialSavedMap || map,
      initialEffects || metadata?.effects,
      initialSavedMap ? shouldStartInitialMap : true,
      roguelikeRun,
    ),
  );
  const [rewardChoices, setRewardChoices] = useState<ReadonlyArray<RewardCard> | null>(null);
  const [resolvedNodeRun, setResolvedNodeRun] = useState<RoguelikeRunState | null>(null);
  useBiomeMusic(game.state.config.biome, metadata?.tags);
  usePlayMusic(game.state.config.biome);
  const onAction = useClientGameAction(game, setGame);
  const playerDetails = useClientGamePlayerDetails(game.state, localPlayer);
  const onUndo = useCallback((type: UndoType) => {
    setGame((game) => undoClientGame(game, type));
    setRenderKey((key) => key + 1);
  }, []);

  const victoryRecorded = useRef(false);

  useEffect(() => {
    if (!game.ended) {
      saveMap(game.state, game.effects);
      if (roguelikeRun) {
        saveRoguelikeRun(roguelikeRun);
      }
      onSaved();
    }
  }, [game.effects, game.ended, game.state, onSaved, roguelikeRun]);

  useEffect(() => {
    if (campaignMapId && onCampaignVictory && !victoryRecorded.current && isHumanVictory(game)) {
      victoryRecorded.current = true;
      onCampaignVictory(campaignMapId);
    }
  }, [campaignMapId, game, onCampaignVictory]);

  useEffect(() => {
    if (!roguelikeRun || victoryRecorded.current || !game.ended) {
      return;
    }

    victoryRecorded.current = true;
    if (isHumanVictory(game)) {
      setRewardChoices(generateRewardChoices(roguelikeRun));
    } else {
      onRoguelikeRunFinished(
        {
          ...roguelikeRun,
          status: 'defeat',
        },
        false,
      );
    }
  }, [game, onRoguelikeRunFinished, roguelikeRun]);

  const startRoguelikeBattle = useCallback(
    (run: RoguelikeRunState) => {
      const battleRun = advancePastNonBattleNode(run);
      const [nextMap, nextMetadata] = createRoguelikeCampaignBattle(battleRun);
      onRoguelikeRunUpdate(battleRun);
      victoryRecorded.current = false;
      setRewardChoices(null);
      setResolvedNodeRun(null);
      setGame(createLocalClientGame(nextMap, nextMetadata.effects, true, battleRun));
      setRenderKey((key) => key + 1);
    },
    [onRoguelikeRunUpdate],
  );

  const chooseReward = useCallback(
    (reward: RewardCard) => {
      if (!roguelikeRun) {
        return;
      }

      const advancedRun = advanceRunAfterReward(applyReward(roguelikeRun, reward));
      if (advancedRun.status === 'victory') {
        onRoguelikeRunFinished(advancedRun, true);
        return;
      }

      if (isBattleNode(advancedRun.node)) {
        startRoguelikeBattle(advancedRun);
      } else {
        const resolvedRun = resolveNonBattleNode(advancedRun);
        onRoguelikeRunUpdate(resolvedRun);
        setRewardChoices(null);
        setResolvedNodeRun(resolvedRun);
      }
    },
    [onRoguelikeRunFinished, onRoguelikeRunUpdate, roguelikeRun, startRoguelikeBattle],
  );

  return (
    <main className={gameScreen}>
      <button className={inGameMenuButton} onClick={onExitToMenu}>
        Menu
      </button>
      {roguelikeRun ? <RunStatus run={roguelikeRun} /> : null}
      <GameMap
        autoPanning
        currentUserId={localPlayer.id}
        fogStyle="soft"
        key={`open-wars-skirmish-${renderKey}`}
        lastActionResponse={game.lastAction}
        map={game.state}
        margin="minimal"
        onAction={onAction}
        pan
        paused={false}
        playerDetails={playerDetails}
        scale={gameScale}
        scroll={false}
        style="floating"
        tilted
      >
        {(props, actions) => {
          const hide = props.lastActionResponse?.type === 'GameEnd';

          return (
            <>
              <MapInfo hide={hide} {...props} />
              <GameActions
                actions={actions}
                canUndoAction
                fade={renderKey === 0}
                hide={hide}
                state={{ ...props, inlineUI: true }}
                undo={onUndo}
                zoom={gameScale}
              />
            </>
          );
        }}
      </GameMap>
      {rewardChoices && roguelikeRun ? (
        <RewardSelection choices={rewardChoices} onChoose={chooseReward} run={roguelikeRun} />
      ) : null}
      {resolvedNodeRun ? (
        <NodeResolution
          run={resolvedNodeRun}
          onContinue={() => startRoguelikeBattle(resolvedNodeRun)}
        />
      ) : null}
    </main>
  );
}

function RunStatus({ run }: { run: RoguelikeRunState }) {
  return (
    <aside className={runStatus}>
      <strong>
        {formatNodeType(run.node)} {run.battle}/{run.battleLimit}
      </strong>
      <span>{describeRunUnlocks(run)}</span>
    </aside>
  );
}

function RewardSelection({
  choices,
  onChoose,
  run,
}: {
  choices: ReadonlyArray<RewardCard>;
  onChoose: (reward: RewardCard) => void;
  run: RoguelikeRunState;
}) {
  return (
    <div className={campaignOverlay}>
      <section className={campaignPanel}>
        <p className={eyebrow}>Victory</p>
        <h2 className={overlayTitle}>Choose a reward</h2>
        <p className={statusMessage}>Battle {run.battle} cleared. Pick one card for this run.</p>
        <div className={rewardGrid}>
          {choices.map((reward) => (
            <button
              className={cx(rewardCard, rarityClass(reward.rarity))}
              key={reward.id}
              onClick={() => onChoose(reward)}
            >
              <span className={rewardRarity}>{reward.rarity}</span>
              <strong>{reward.title}</strong>
              <span>{reward.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function NodeResolution({ onContinue, run }: { onContinue: () => void; run: RoguelikeRunState }) {
  return (
    <div className={campaignOverlay}>
      <section className={campaignPanel}>
        <p className={eyebrow}>{formatNodeType(run.node)}</p>
        <h2 className={overlayTitle}>Campaign progress</h2>
        <p className={statusMessage}>{getNodeResolutionText(run)}</p>
        <button className={menuButton} onClick={onContinue}>
          Continue
        </button>
      </section>
    </div>
  );
}

function getNodeResolutionText(run: RoguelikeRunState) {
  switch (run.node) {
    case 'event':
      return 'A battlefield opportunity adds extra funds to future deployments.';
    case 'rest':
      return 'Your forces recover momentum and start future battles with more charge.';
    case 'shop':
      return 'A field trader converts spare supplies into extra starting funds.';
    case 'treasure':
      return 'A hidden cache increases your starting treasury for the rest of the run.';
    case 'boss':
    case 'elite':
    case 'normal':
      return `${formatNodeType(run.node)} awaits.`;
    default: {
      run.node satisfies never;
      return 'The route continues.';
    }
  }
}

function rarityClass(rarity: RewardCard['rarity']) {
  switch (rarity) {
    case 'common':
      return rewardCommon;
    case 'rare':
      return rewardRare;
    case 'epic':
      return rewardEpic;
    case 'legendary':
      return rewardLegendary;
    default: {
      rarity satisfies never;
      return rewardCommon;
    }
  }
}

function LocalMapEditor({
  createMap,
  editorSessionKey,
  mapObject,
  mapObjects,
  onDeleteMap,
  onExitToMenu,
  onNewMap,
  onSelectMap,
  updateMap,
}: {
  createMap: MapCreateFunction;
  editorSessionKey: number;
  mapObject: MapObject | null;
  mapObjects: ReadonlyArray<MapObject>;
  onDeleteMap: (id: string) => void;
  onExitToMenu: () => void;
  onNewMap: () => void;
  onSelectMap: (id: string) => void;
  updateMap: MapUpdateFunction;
}) {
  return (
    <main className={editorScreen}>
      <button className={editorMenuButton} onClick={onExitToMenu}>
        Menu
      </button>
      <ScrollContainer className={editorScrollContainer}>
        <MapEditor
          animationSpeed={null}
          autoPanning
          confirmActionStyle="touch"
          createMap={createMap}
          fogStyle="soft"
          isAdmin
          key={mapObject?.id || `new-map-${editorSessionKey}`}
          mapObject={mapObject}
          mapOptions={mapObjects}
          onDeleteMap={onDeleteMap}
          onNewMap={onNewMap}
          onSelectMap={onSelectMap}
          quickSave
          setHasChanges={() => {}}
          tiltStyle="on"
          updateMap={updateMap}
          user={localPlayer}
        />
      </ScrollContainer>
    </main>
  );
}

function LocalSpriteEditor({ onExitToMenu }: { onExitToMenu: () => void }) {
  return (
    <main className={editorScreen}>
      <button className={editorMenuButton} onClick={onExitToMenu}>
        Menu
      </button>
      <ScrollContainer className={editorScrollContainer}>
        <SpriteEditor />
      </ScrollContainer>
    </main>
  );
}

function useResponsiveGameScale(scale: number) {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    window.addEventListener('resize', updateWidth);
    window.addEventListener('orientationchange', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
      window.removeEventListener('orientationchange', updateWidth);
    };
  }, []);

  if (width < 480) {
    return Math.min(scale, 1.1);
  }

  if (width < 720) {
    return Math.min(scale, 1.25);
  }

  return scale;
}

function isHumanVictory(game: ClientGame) {
  const lastAction = game.lastAction;
  if (!game.ended || lastAction?.type !== 'GameEnd') {
    return false;
  }

  const humanPlayer = game.state.getPlayers().find((player) => player.isHumanPlayer());
  const winnerId = lastAction.toPlayer;
  if (!humanPlayer || winnerId == null) {
    return false;
  }

  return winnerId === humanPlayer.id || game.state.getTeam(humanPlayer).players.has(winnerId);
}

function loadCompletedCampaignMapIds(): ReadonlySet<string> {
  const json = localStorage.getItem(campaignCompletedMapsKey);
  if (!json) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(json);
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveCompletedCampaignMapIds(mapIds: ReadonlySet<string>) {
  try {
    localStorage.setItem(campaignCompletedMapsKey, JSON.stringify([...mapIds]));
  } catch {
    // Storage can fail in private browsing or under quota pressure.
  }
}

function createLocalClientGame(
  map: MapData,
  initialEffects: Effects | null | undefined,
  shouldStart: boolean,
  roguelikeRun?: RoguelikeRunState | null,
): ClientGame {
  const effects = initialEffects || new Map();
  const state = shouldStart ? prepareLocalMap(map, roguelikeRun) : map;
  const lastAction = shouldStart ? null : startAction;
  return {
    effects,
    ended: false,
    lastAction,
    state,
    turnState: [state, lastAction || startAction, effects, []],
  };
}

function prepareLocalMap(map: MapData, roguelikeRun: RoguelikeRunState | null = null) {
  const preparedMap = mapWithAIPlayers(applyRunPlayerIdentity(map, localPlayer.id, roguelikeRun));
  const startedMap = startGame(preparedMap);
  return roguelikeRun ? applyRunPlayerBonuses(startedMap, roguelikeRun) : startedMap;
}

function loadSavedGame(): LoadedSavedGame | null {
  const json = localStorage.getItem(savedGameKey);
  if (!json) {
    return null;
  }

  try {
    const parsed = JSON.parse(json) as SavedGame | ReturnType<MapData['toJSON']>;
    if (parsed && typeof parsed === 'object' && 'version' in parsed) {
      return parsed.version === savedGameVersion
        ? {
            effects: parsed.effects ? decodeEffects(parsed.effects) : null,
            map: MapData.fromObject(parsed.map),
          }
        : null;
    }

    return {
      effects: null,
      map: MapData.fromObject(parsed),
    };
  } catch {
    return null;
  }
}

function saveMap(map: MapData, effects: Effects) {
  try {
    localStorage.setItem(
      savedGameKey,
      JSON.stringify({
        effects: encodeEffects(effects),
        map: map.toJSON(),
        savedAt: dateNow(),
        version: savedGameVersion,
      } satisfies SavedGame),
    );
  } catch {
    // Storage can fail in private browsing or under quota pressure. The game remains playable.
  }
}

function loadRoguelikeRun(): RoguelikeRunState | null {
  const json = localStorage.getItem(savedRoguelikeRunKey);
  if (!json) {
    return null;
  }

  try {
    return normalizeRunState(JSON.parse(json) as RoguelikeRunState);
  } catch {
    return null;
  }
}

function saveRoguelikeRun(run: RoguelikeRunState) {
  try {
    localStorage.setItem(savedRoguelikeRunKey, JSON.stringify(run));
  } catch {
    // Storage can fail in private browsing or under quota pressure.
  }
}

function loadRoguelikeMeta(): RoguelikeMetaProgression {
  const json = localStorage.getItem(savedRoguelikeMetaKey);
  if (!json) {
    return normalizeMetaProgression(null);
  }

  try {
    return normalizeMetaProgression(JSON.parse(json) as RoguelikeMetaProgression);
  } catch {
    return normalizeMetaProgression(null);
  }
}

function saveRoguelikeMeta(meta: RoguelikeMetaProgression) {
  try {
    localStorage.setItem(savedRoguelikeMetaKey, JSON.stringify(meta));
  } catch {
    // Storage can fail in private browsing or under quota pressure.
  }
}

function isEditorMapNameTaken(
  mapObjects: ReadonlyArray<MapObject>,
  name: string,
  excludeId?: string,
) {
  const normalized = name.trim().toLowerCase();
  return mapObjects.some(
    (mapObject) => mapObject.id !== excludeId && mapObject.name.trim().toLowerCase() === normalized,
  );
}

function createEditorMapObject(
  variables: Parameters<MapCreateFunction>[0] | Parameters<MapUpdateFunction>[0],
  id = createLocalEditorMapId(),
): MapObject {
  return {
    campaigns: {
      edges: [],
    },
    canEdit: true,
    creator: localMapCreator,
    effects: JSON.stringify(encodeEffects(variables.effects)),
    id,
    name: variables.mapName,
    slug: toSlug(variables.mapName),
    state: JSON.stringify(variables.map.toJSON()),
    tags: variables.tags,
  };
}

function createLocalEditorMapId() {
  return `local-map-${dateNow().toString(36)}`;
}

function upsertEditorMapObject(
  mapObjects: ReadonlyArray<MapObject>,
  mapObject: MapObject,
): ReadonlyArray<MapObject> {
  return [mapObject, ...mapObjects.filter(({ id }) => id !== mapObject.id)];
}

function saveEditorMapObjects(
  mapObjects: ReadonlyArray<MapObject>,
  setSaveState?: Parameters<MapCreateFunction>[1],
) {
  try {
    localStorage.setItem(savedEditorMapKey, JSON.stringify(mapObjects));
    setSaveState?.({ id: 'saved' });
    return true;
  } catch {
    setSaveState?.({ message: 'Map could not be saved locally.' });
    return false;
  }
}

function loadSavedEditorMapLibrary(): EditorMapLibrary {
  let maps = loadSavedEditorMapObjects();
  const appliedTutorialVersion = Number(localStorage.getItem(campaign1TutorialVersionKey) || 0);
  const shouldReseedOfficialMaps =
    appliedTutorialVersion < campaign1TutorialVersion || needsOfficialCampaignReseed(maps);

  if (shouldReseedOfficialMaps) {
    maps = ensureCampaign1TutorialMap(maps, localMapCreator);
    saveEditorMapObjects(maps);
    localStorage.setItem(campaign1TutorialVersionKey, String(campaign1TutorialVersion));
  }

  const campaign1Map = getDefaultTutorialMap(maps) as MapObject | null;

  return {
    current: campaign1Map || maps[0] || null,
    maps,
  };
}

function loadSavedEditorMapObjects(): ReadonlyArray<MapObject> {
  const json = localStorage.getItem(savedEditorMapKey);
  if (!json) {
    return [];
  }

  try {
    const parsed = JSON.parse(json) as MapObject | ReadonlyArray<MapObject> | null;
    const maps = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return maps.map(normalizeMapObject).filter(isMapObject);
  } catch {
    return [];
  }
}

function isMapObject(mapObject: MapObject | null): mapObject is MapObject {
  return mapObject != null;
}

function normalizeMapObject(mapObject: MapObject | null): MapObject | null {
  if (!mapObject) {
    return null;
  }

  if (typeof mapObject.state !== 'string' || !mapObject.state) {
    return null;
  }

  return {
    campaigns: {
      edges: [],
    },
    canEdit: true,
    creator:
      mapObject.creator &&
      typeof mapObject.creator.displayName === 'string' &&
      typeof mapObject.creator.id === 'string' &&
      typeof mapObject.creator.username === 'string'
        ? mapObject.creator
        : localMapCreator,
    effects: typeof mapObject.effects === 'string' ? mapObject.effects : '',
    id: typeof mapObject.id === 'string' ? mapObject.id : createLocalEditorMapId(),
    name: typeof mapObject.name === 'string' ? mapObject.name : '',
    slug: typeof mapObject.slug === 'string' ? mapObject.slug : '',
    state: mapObject.state,
    tags: Array.isArray(mapObject.tags)
      ? mapObject.tags.filter((tag) => typeof tag === 'string')
      : [],
  };
}

function decodeEditorEffects(effects: string): Effects | null {
  if (!effects) {
    return null;
  }

  try {
    return decodeEffects(JSON.parse(effects));
  } catch {
    return null;
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // The service worker caches assets aggressively (cache-first). In development
  // this serves stale, potentially broken modules. Unregister it and clear its
  // caches so the live Vite dev server is always used.
  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new Event(appUpdateAvailableEvent));
            }
          });
        });
      })
      .catch(() => {});
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing root element.');
}

createRoot(root).render(
  <ProductionErrorBoundary>
    <RootScope>
      <OpenWarsApp />
    </RootScope>
  </ProductionErrorBoundary>,
);

const appScope = css`
  all: initial;

  color: ${applyVar('text-color')};
  font-family: Athena, ui-sans-serif, system-ui, sans-serif;
  font-size: 20px;
  font-weight: normal;
  line-height: 1em;
  min-height: 100vh;
  outline: none;
  touch-action: pan-x pan-y;
  width: 100%;

  img {
    max-width: initial;
  }

  svg {
    display: initial;
  }

  ${getScopedCSSDefinitions()}
`;

const bootScreen = css`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  width: 100%;
`;

const menuScreen = css`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
  position: relative;
  width: 100%;
`;

const menuCard = css`
  align-items: stretch;
  backdrop-filter: blur(6px);
  background: rgba(245, 247, 241, 0.92);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 380px;
  padding: 28px;
  position: relative;
  text-align: center;
  width: min(100%, 380px);
  z-index: 1;
`;

const eyebrow = css`
  color: #586575;
  font-family: Athena, ui-sans-serif, system-ui, sans-serif;
  font-size: 18px;
  margin: 0;
  text-transform: uppercase;
`;

const title = css`
  color: #1f2933;
  font-family: Athena, ui-sans-serif, system-ui, sans-serif;
  font-size: 48px;
  line-height: 1;
  margin: 0;
`;

const buttonStack = css`
  display: grid;
  gap: 12px;
`;

const secondaryActions = css`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
`;

const menuHint = css`
  color: #586575;
  font-size: 14px;
  line-height: 1.35;
  margin: -4px 0 4px;
`;

const menuButton = css`
  -webkit-user-drag: none;
  background: #f9fbf3;
  border: 0;
  color: #1f2933;
  cursor: pointer;
  font: inherit;
  min-height: 56px;
  padding: 10px 16px;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
  user-select: none;
  width: 100%;

  &:hover {
    background: #ffffff;
    color: #0c6fa5;
    transform: scaleX(1.04) scaleY(1.02);
  }

  &:active {
    transform: scaleX(0.96) scaleY(0.98);
  }
`;

const secondaryButton = css`
  -webkit-user-drag: none;
  background: rgba(249, 251, 243, 0.72);
  border: 0;
  color: #1f2933;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  min-height: 40px;
  padding: 8px 12px;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 150ms ease;
  user-select: none;

  &:hover {
    background: #ffffff;
    color: #0c6fa5;
    transform: scaleX(1.04) scaleY(1.02);
  }
`;

const exitButton = css`
  color: #8f2f2f;
`;

const dangerButton = css`
  color: #8f2f2f;
`;

const optionList = css`
  display: grid;
  gap: 12px;
`;

const optionRow = css`
  align-items: center;
  background: rgba(255, 255, 255, 0.64);
  color: #1f2933;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-height: 52px;
  padding: 8px 12px;
  text-align: left;
`;

const smallButton = css`
  font-size: 14px;
  min-height: 36px;
  width: auto;
`;

const statusMessage = css`
  color: #586575;
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
`;

const gameScreen = css`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  overflow: hidden;
  padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
  position: relative;
`;

const runStatus = css`
  background: rgba(249, 251, 243, 0.92);
  color: #1f2933;
  display: grid;
  font-size: 14px;
  gap: 4px;
  left: max(12px, env(safe-area-inset-left));
  line-height: 1.25;
  max-width: min(320px, calc(100vw - 128px));
  padding: 10px 12px;
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  z-index: 20;
`;

const campaignOverlay = css`
  align-items: center;
  background: rgba(9, 14, 20, 0.58);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
  position: fixed;
  z-index: 30;
`;

const campaignPanel = css`
  background: rgba(245, 247, 241, 0.96);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.36);
  color: #1f2933;
  display: grid;
  gap: 16px;
  max-height: calc(100vh - 48px);
  max-width: 760px;
  overflow: auto;
  padding: 24px;
  text-align: center;
  width: min(100%, 760px);
`;

const overlayTitle = css`
  color: #1f2933;
  font-family: Athena, ui-sans-serif, system-ui, sans-serif;
  font-size: 40px;
  line-height: 1;
  margin: 0;
`;

const rewardGrid = css`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const rewardCard = css`
  -webkit-user-drag: none;
  background: #ffffff;
  border: 0;
  color: #1f2933;
  cursor: pointer;
  display: grid;
  font: inherit;
  font-size: 15px;
  gap: 10px;
  line-height: 1.3;
  min-height: 190px;
  padding: 16px;
  text-align: left;
  transition:
    background-color 150ms ease,
    transform 150ms ease;
  user-select: none;

  strong {
    font-size: 22px;
    line-height: 1.05;
  }

  &:hover {
    background: #f9fbf3;
    transform: translateY(-2px);
  }
`;

const rewardRarity = css`
  font-size: 12px;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const rewardCommon = css`
  border-top: 6px solid #697889;
`;

const rewardRare = css`
  border-top: 6px solid #0c6fa5;
`;

const rewardEpic = css`
  border-top: 6px solid #7a4fb3;
`;

const rewardLegendary = css`
  border-top: 6px solid #b06c20;
`;

const editorScreen = css`
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  overflow: hidden;
  position: relative;
`;

const editorScrollContainer = css`
  height: 100vh;
  height: 100svh;
  height: 100dvh;
  overflow: auto;
  overscroll-behavior: contain;
`;

const inGameMenuButton = css`
  background: rgba(249, 251, 243, 0.92);
  border: 0;
  color: #1f2933;
  cursor: pointer;
  font: inherit;
  min-height: 44px;
  padding: 8px 14px;
  position: fixed;
  right: max(12px, env(safe-area-inset-right));
  top: max(12px, env(safe-area-inset-top));
  z-index: 20;

  &:hover {
    color: #0c6fa5;
  }
`;

const editorMenuButtonOverlay = css`
  z-index: 40;
`;

const editorMenuButton = cx(inGameMenuButton, editorMenuButtonOverlay);

const errorScreen = css`
  align-items: center;
  background: linear-gradient(135deg, #121926, #22364a 48%, #182533);
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
`;
