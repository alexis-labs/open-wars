import { type AttributeRange } from '@deities/athena/lib/getAttributeRange.tsx';
import { type MapObject } from '@deities/hera/editor/Types.tsx';
import Range from '@deities/hera/card/Range.tsx';
import Icon from '@deities/ui/Icon.tsx';
import CampaignIcon from '@deities/ui/icons/Campaign.tsx';
import { css, cx } from '@emotion/css';
import { memo, useMemo, useState } from 'react';
import {
  findCampaignMap,
  getCampaignCatalog,
  getCampaignProgress,
  getCampaignUnlockRequirement,
  getDifficultyLabel,
  getMapSummary,
  getMissionUnlockRequirement,
  isCampaignUnlocked,
  isMissionUnlocked,
  type OfflineCampaign,
  type OfflineCampaignMission,
} from './campaignCatalog.tsx';

const difficultyAccentColors: Record<AttributeRange, string> = {
  1: '#2f8f46',
  2: '#4f9f5d',
  3: '#d18b2a',
  4: '#c45a3a',
  5: '#8f2f2f',
};

type CampaignMenuProps = Readonly<{
  completedMapIds: ReadonlySet<string>;
  maps: ReadonlyArray<MapObject>;
  onBack: () => void;
  onPlayMission: (mapObject: MapObject) => void;
}>;

export default memo(function CampaignMenu({
  completedMapIds,
  maps,
  onBack,
  onPlayMission,
}: CampaignMenuProps) {
  const campaigns = useMemo(() => getCampaignCatalog(maps), [maps]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;

  return (
    <main className={menuScreen}>
      <section className={menuCard}>
        <div className={menuHeader}>
          <p className={eyebrow}>Open Wars</p>
          <h1 className={title}>{selectedCampaign ? selectedCampaign.name : 'Campaign'}</h1>
        </div>

        <div className={menuScrollArea}>
          {selectedCampaign ? (
            <MissionListView
              campaign={selectedCampaign}
              campaigns={campaigns}
              completedMapIds={completedMapIds}
              maps={maps}
              onBack={() => setSelectedCampaignId(null)}
              onPlayMission={onPlayMission}
            />
          ) : (
            <CampaignListView
              campaigns={campaigns}
              completedMapIds={completedMapIds}
              onSelectCampaign={setSelectedCampaignId}
            />
          )}
        </div>

        <button className={menuButton} onClick={selectedCampaign ? () => setSelectedCampaignId(null) : onBack}>
          Back
        </button>
      </section>
    </main>
  );
});

const CampaignListView = memo(function CampaignListView({
  campaigns,
  completedMapIds,
  onSelectCampaign,
}: Readonly<{
  campaigns: ReadonlyArray<OfflineCampaign>;
  completedMapIds: ReadonlySet<string>;
  onSelectCampaign: (campaignId: string) => void;
}>) {
  if (!campaigns.length) {
    return (
      <p className={menuHint}>
        No campaign missions are available yet. Create maps in the map editor to play custom missions.
      </p>
    );
  }

  return (
    <>
      <p className={menuHint}>Choose a campaign to view missions and difficulty ratings.</p>
      <div className={cardList}>
        {campaigns.map((campaign) => {
          const progress = getCampaignProgress(campaign, completedMapIds);
          const progressRatio = progress.total ? progress.completed / progress.total : 0;
          const unlocked = isCampaignUnlocked(campaign, completedMapIds, campaigns);
          const lockMessage = getCampaignUnlockRequirement(campaign, campaigns);

          return (
            <button
              className={cx(campaignCard, !unlocked && campaignCardLocked)}
              key={campaign.id}
              onClick={() => onSelectCampaign(campaign.id)}
              style={{ borderLeftColor: difficultyAccentColors[campaign.difficulty] }}
            >
              <div className={campaignCardHeader}>
                <span className={campaignIconWrap}>
                  <Icon icon={CampaignIcon} />
                </span>
                <div className={campaignCardTitleBlock}>
                  <span className={campaignCardTitle}>{campaign.name}</span>
                  <DifficultyBadge difficulty={campaign.difficulty} />
                </div>
              </div>
              <p className={campaignCardDescription}>{campaign.description}</p>
              {lockMessage && !unlocked ? <p className={campaignLockMessage}>{lockMessage}</p> : null}
              <div className={progressRow}>
                <span className={progressLabel}>
                  {progress.completed} / {progress.total} completed
                </span>
                <span className={progressLabel}>
                  {campaign.missions.length} mission{campaign.missions.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className={progressTrack}>
                <div className={progressFill} style={{ width: `${progressRatio * 100}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
});

const MissionListView = memo(function MissionListView({
  campaign,
  campaigns,
  completedMapIds,
  maps,
  onBack,
  onPlayMission,
}: Readonly<{
  campaign: OfflineCampaign;
  campaigns: ReadonlyArray<OfflineCampaign>;
  completedMapIds: ReadonlySet<string>;
  maps: ReadonlyArray<MapObject>;
  onBack: () => void;
  onPlayMission: (mapObject: MapObject) => void;
}>) {
  const progress = getCampaignProgress(campaign, completedMapIds);
  const campaignUnlocked = isCampaignUnlocked(campaign, completedMapIds, campaigns);
  const campaignLockMessage = getCampaignUnlockRequirement(campaign, campaigns);

  return (
    <>
      <button className={breadcrumbButton} onClick={onBack}>
        All Campaigns
      </button>
      <div className={campaignSummary}>
        <p className={campaignCardDescription}>{campaign.description}</p>
        <DifficultyBadge difficulty={campaign.difficulty} />
        <p className={progressLabel}>
          {progress.completed} / {progress.total} completed
        </p>
        {campaignLockMessage && !campaignUnlocked ? (
          <p className={campaignLockMessage}>{campaignLockMessage}</p>
        ) : null}
      </div>
      <div className={cardList}>
        {campaign.missions.map((mission, index) => {
          const mapObject = findCampaignMap(maps, mission.mapId);
          if (!mapObject) {
            return null;
          }

          const missionUnlocked =
            campaignUnlocked && isMissionUnlocked(campaign, index, completedMapIds);
          const lockMessage = !campaignUnlocked
            ? campaignLockMessage
            : getMissionUnlockRequirement(campaign, index);

          return (
            <MissionCard
              completed={completedMapIds.has(mission.mapId)}
              key={mission.mapId}
              locked={!missionUnlocked}
              lockMessage={lockMessage}
              mapObject={mapObject}
              mission={mission}
              onPlay={() => onPlayMission(mapObject)}
            />
          );
        })}
      </div>
    </>
  );
});

const MissionCard = memo(function MissionCard({
  completed,
  lockMessage,
  locked,
  mapObject,
  mission,
  onPlay,
}: Readonly<{
  completed: boolean;
  lockMessage: string | null;
  locked: boolean;
  mapObject: MapObject;
  mission: OfflineCampaignMission;
  onPlay: () => void;
}>) {
  return (
    <button
      className={cx(missionCard, locked && missionCardLocked)}
      disabled={locked}
      onClick={locked ? undefined : onPlay}
      style={{ borderLeftColor: difficultyAccentColors[mission.difficulty] }}
    >
      <div className={missionCardTopRow}>
        <span className={missionCardTitle}>
          {completed ? <span className={completedCheck}>✓</span> : null}
          <span>{mission.name}</span>
        </span>
        <DifficultyBadge compact difficulty={mission.difficulty} />
      </div>
      <p className={missionCardDescription}>{mission.description}</p>
      {locked && lockMessage ? <p className={missionLockMessage}>{lockMessage}</p> : null}
      <p className={missionCardMeta}>
        {getDifficultyLabel(mission.difficulty)} · {getMapSummary(mapObject)}
      </p>
    </button>
  );
});

const DifficultyBadge = memo(function DifficultyBadge({
  compact,
  difficulty,
}: Readonly<{
  compact?: true;
  difficulty: AttributeRange;
}>) {
  return (
    <span className={cx(difficultyBadge, compact && difficultyBadgeCompact)}>
      <Range end value={difficulty} />
      {!compact ? <span className={difficultyLabel}>{getDifficultyLabel(difficulty)}</span> : null}
    </span>
  );
});

const menuScreen = css`
  align-items: center;
  background:
    radial-gradient(circle at 28% 24%, rgba(111, 191, 115, 0.32), transparent 28%),
    radial-gradient(circle at 78% 22%, rgba(31, 111, 139, 0.34), transparent 26%),
    linear-gradient(135deg, #121926, #22364a 48%, #182533);
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom));
  position: relative;

  &::before {
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
    background-size: 48px 48px;
    content: '';
    inset: 0;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.7), transparent);
    pointer-events: none;
    position: fixed;
  }
`;

const menuCard = css`
  align-items: stretch;
  backdrop-filter: blur(6px);
  background: rgba(245, 247, 241, 0.92);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: auto 0;
  max-height: calc(100dvh - max(48px, env(safe-area-inset-top)) - max(48px, env(safe-area-inset-bottom)));
  max-width: 520px;
  min-height: 0;
  overflow: hidden;
  padding: 28px;
  position: relative;
  text-align: center;
  width: min(100%, 520px);
  z-index: 1;
`;

const menuHeader = css`
  display: grid;
  flex: 0 0 auto;
  gap: 8px;
`;

const menuScrollArea = css`
  -webkit-overflow-scrolling: touch;
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  text-align: left;
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
  font-size: 42px;
  line-height: 1;
  margin: 0;
`;

const menuHint = css`
  color: #586575;
  font-size: 14px;
  line-height: 1.35;
  margin: -4px 0 4px;
  text-align: center;
`;

const menuButton = css`
  -webkit-user-drag: none;
  background: #f9fbf3;
  border: 0;
  color: #1f2933;
  cursor: pointer;
  flex: 0 0 auto;
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

const cardList = css`
  display: grid;
  gap: 12px;
`;

const campaignCard = css`
  background: rgba(255, 255, 255, 0.72);
  border: 0;
  border-left: 4px solid #2f8f46;
  box-shadow: 0 10px 24px rgba(31, 41, 51, 0.08);
  color: #1f2933;
  cursor: pointer;
  display: grid;
  gap: 10px;
  padding: 16px;
  text-align: left;
  transition:
    background-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
  width: 100%;

  &:hover {
    background: #ffffff;
    box-shadow: 0 16px 32px rgba(31, 41, 51, 0.12);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const campaignCardLocked = css`
  opacity: 0.82;
`;

const campaignLockMessage = css`
  color: #8a5a14;
  font-size: 13px;
  font-weight: 600;
  margin: 0;
`;

const campaignCardHeader = css`
  align-items: center;
  display: flex;
  gap: 12px;
`;

const campaignIconWrap = css`
  align-items: center;
  background: rgba(12, 111, 165, 0.12);
  border-radius: 12px;
  color: #0c6fa5;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 22px;
  height: 44px;
  justify-content: center;
  width: 44px;
`;

const campaignCardTitleBlock = css`
  display: grid;
  flex: 1;
  gap: 6px;
  min-width: 0;
`;

const campaignCardTitle = css`
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
`;

const campaignCardDescription = css`
  color: #586575;
  font-size: 14px;
  line-height: 1.45;
  margin: 0;
`;

const progressRow = css`
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const progressLabel = css`
  color: #697889;
  font-size: 13px;
`;

const progressTrack = css`
  background: rgba(31, 41, 51, 0.08);
  border-radius: 999px;
  height: 6px;
  overflow: hidden;
`;

const progressFill = css`
  background: linear-gradient(90deg, #2f8f46, #6fbf73);
  border-radius: inherit;
  height: 100%;
  transition: width 180ms ease;
`;

const breadcrumbButton = css`
  align-self: flex-start;
  background: transparent;
  border: 0;
  color: #0c6fa5;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  padding: 0;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }
`;

const campaignSummary = css`
  display: grid;
  gap: 10px;
  text-align: left;
`;

const missionCard = css`
  background: rgba(255, 255, 255, 0.72);
  border: 0;
  border-left: 4px solid #2f8f46;
  box-shadow: 0 10px 24px rgba(31, 41, 51, 0.08);
  color: #1f2933;
  cursor: pointer;
  display: grid;
  gap: 8px;
  padding: 16px;
  text-align: left;
  transition:
    background-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
  width: 100%;

  &:hover:not(:disabled) {
    background: #ffffff;
    box-shadow: 0 16px 32px rgba(31, 41, 51, 0.12);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const missionCardLocked = css`
  cursor: not-allowed;
  opacity: 0.62;
`;

const missionCardTopRow = css`
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
`;

const missionCardTitle = css`
  align-items: center;
  display: inline-flex;
  font-size: 18px;
  font-weight: 700;
  gap: 8px;
  line-height: 1.2;
`;

const completedCheck = css`
  color: #2f8f46;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
`;

const missionCardDescription = css`
  color: #586575;
  font-size: 14px;
  line-height: 1.45;
  margin: 0;
`;

const missionCardMeta = css`
  color: #697889;
  font-size: 13px;
  margin: 0;
`;

const missionLockMessage = css`
  color: #8a5a14;
  font-size: 13px;
  font-weight: 600;
  margin: 0;
`;

const difficultyBadge = css`
  align-items: center;
  background: rgba(31, 41, 51, 0.06);
  border-radius: 999px;
  display: inline-flex;
  gap: 8px;
  justify-content: center;
  padding: 6px 10px;
  width: fit-content;
`;

const difficultyBadgeCompact = css`
  flex: 0 0 auto;
  padding: 4px 8px;
`;

const difficultyLabel = css`
  color: #586575;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
`;
