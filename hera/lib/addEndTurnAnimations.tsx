import { EndTurnActionResponse } from '@deities/apollo/ActionResponse.tsx';
import { PowerStation } from '@deities/athena/info/Building.tsx';
import { PowerStationSkillMultiplier, Skill } from '@deities/athena/info/Skill.tsx';
import calculateFunds from '@deities/athena/lib/calculateFunds.tsx';
import updatePlayer from '@deities/athena/lib/updatePlayer.tsx';
import applyBeginTurnStatusEffects, {
  isPoisoned,
} from '@deities/athena/lib/applyBeginTurnStatusEffects.tsx';
import canActivatePower from '@deities/athena/lib/canActivatePower.tsx';
import getAllUnitsToRefill from '@deities/athena/lib/getAllUnitsToRefill.tsx';
import getUnitsByPositions from '@deities/athena/lib/getUnitsByPositions.tsx';
import getUnitsToHeal, { HealEntry } from '@deities/athena/lib/getUnitsToHeal.tsx';
import shouldRemoveUnit from '@deities/athena/lib/shouldRemoveUnit.tsx';
import subtractFuel from '@deities/athena/lib/subtractFuel.tsx';
import {
  HealAmount,
  MaxHealth,
  PowerStationMultiplier,
} from '@deities/athena/map/Configuration.tsx';
import Player from '@deities/athena/map/Player.tsx';
import Unit from '@deities/athena/map/Unit.tsx';
import Vector, { sortByVectorKey, sortVectors, szudzik } from '@deities/athena/map/Vector.tsx';
import MapData from '@deities/athena/MapData.tsx';
import { VisionT } from '@deities/athena/Vision.tsx';
import sortBy from '@nkzw/core/sortBy.js';
import ImmutableMap from '@nkzw/immutable-map';
import { fbt } from 'fbtee';
import NullBehavior from '../behavior/NullBehavior.tsx';
import { Actions, State, StateLike, StateToStateLike } from '../Types.tsx';
import animateHeal from './animateHeal.tsx';
import animatePoison from './animatePoison.tsx';
import animateSupply from './animateSupply.tsx';
import AnimationKey from './AnimationKey.tsx';
import explodeUnits from './explodeUnits.tsx';
import getTranslatedFactionName from './getTranslatedFactionName.tsx';
import isFakeEndTurn from './isFakeEndTurn.tsx';

const emptyUnitMap: ReadonlyMap<Vector, Unit> = new Map();
const emptyUnitHealMap: ReadonlyMap<Vector, HealEntry> = new Map();
const emptyIncomeEntries: ReadonlyArray<IncomeEntry> = [];

type IncomeEntry = [position: Vector, amount: number];
type RawIncomeEntry = [position: Vector, funds: number, visible: boolean];

const partitionUnitsToHeal = (
  units: ImmutableMap<Vector, HealEntry>,
): [unitsToHeal: ReadonlyMap<Vector, HealEntry>, unitsToSupply: ReadonlyMap<Vector, Unit>] => {
  const unitsToHeal = new Map<Vector, HealEntry>();
  const unitsToSupply = new Map<Vector, Unit>();
  for (const [vector, [unit, amount]] of units) {
    if (unit.health < MaxHealth) {
      unitsToHeal.set(vector, [unit, amount]);
    } else if (amount >= HealAmount) {
      unitsToSupply.set(vector, unit);
    }
  }
  return [unitsToHeal, unitsToSupply];
};

const getIncomeEntries = (map: MapData, player: Player, vision: VisionT) => {
  let powerStations = 0;
  const entries: Array<RawIncomeEntry> = [];

  for (const [vector, building] of map.buildings) {
    if (map.matchesPlayer(player, building)) {
      if (building.info === PowerStation) {
        powerStations++;
      }

      const funds = building.info.configuration.funds;
      if (funds > 0) {
        entries.push([vector, funds, vision.isVisible(map, vector)]);
      }
    }
  }

  if (!entries.length) {
    return emptyIncomeEntries;
  }

  const multiplier =
    map.config.multiplier *
    (1 +
      (PowerStationMultiplier +
        (player.skills.has(Skill.UnlockPowerStation) ? PowerStationSkillMultiplier : 0)) *
        powerStations);

  const sortedEntries = sortBy(entries, ([vector]) => szudzik(vector.x + 1, vector.y + 1));
  const totalFunds = calculateFunds(map, player);
  const roundedDownTotal = sortedEntries.reduce(
    (sum, [, funds]) => sum + Math.floor(funds * multiplier),
    0,
  );
  let remainingRounding = Math.max(0, totalFunds - roundedDownTotal);

  return sortedEntries
    .map(([vector, funds, visible]) => {
      const amount = Math.floor(funds * multiplier) + (remainingRounding-- > 0 ? 1 : 0);
      return visible ? ([vector, amount] as IncomeEntry) : null;
    })
    .filter((entry): entry is IncomeEntry => !!entry && entry[1] > 0);
};

const setPlayerFunds = (map: MapData, player: Player['id'], funds: number) =>
  map.copy({
    teams: updatePlayer(map.teams, map.getPlayer(player).setFunds(funds)),
  });

export const getEndTurnIncomeStartMap = (
  map: MapData,
  actionResponse: EndTurnActionResponse,
) => {
  if (isFakeEndTurn(actionResponse)) {
    return map;
  }

  const player = map.getPlayer(actionResponse.next.player);
  return setPlayerFunds(
    map,
    player.id,
    Math.max(0, actionResponse.next.funds - calculateFunds(map, player)),
  );
};

const incrementPlayerFunds = (map: MapData, player: Player['id'], amount: number) =>
  map.copy({
    teams: updatePlayer(map.teams, map.getPlayer(player).modifyFunds(amount)),
  });

const animateIncome = (
  state: State,
  incomeEntries: ReadonlyArray<IncomeEntry>,
  player: Player['id'],
  onComplete: StateToStateLike = (state) => state,
): StateLike => {
  const { animations } = state;
  const [item, ...remainingItems] = incomeEntries;
  const position = item?.[0];
  return (
    position
      ? {
          animations: animations.set(new AnimationKey(), {
            onComplete: (state) => {
              const map = incrementPlayerFunds(state.map, player, item[1]);
              const nextState = {
                ...state,
                animations: state.animations.set(new AnimationKey(), {
                  change: item[1],
                  labelPrefix: '$',
                  position,
                  previousHealth: 0,
                  type: 'health',
                }),
                map,
              };
              return {
                map,
                ...animateIncome(nextState, remainingItems, player, onComplete),
              };
            },
            positions: [position],
            type: 'scrollIntoView',
          }),
        }
      : onComplete(state)
  )!;
};

export default function addEndTurnAnimations(
  actions: Actions,
  actionResponse: EndTurnActionResponse,
  state: State,
  maybeExtraPositions: Promise<ReadonlyArray<Vector> | null> | ReadonlyArray<Vector> | null,
  onComplete: StateToStateLike,
) {
  const { requestFrame, update } = actions;
  const {
    current: { player: currentPlayer },
    next: { player: nextPlayer },
    round,
  } = actionResponse;
  const isFake = isFakeEndTurn(actionResponse);
  const isViewer = !isFake && state.currentViewer === nextPlayer;
  return {
    animations: state.animations.set(new AnimationKey(), {
      color: nextPlayer,
      length: 'short',
      onComplete: (state) => {
        requestFrame(async () => {
          const { map, vision } = state;
          const newMap = isFake
            ? map
            : applyBeginTurnStatusEffects(subtractFuel(map, nextPlayer), nextPlayer);

          const complete = (state: State) => {
            const { map } = state;
            if (isViewer) {
              const player = map.maybeGetPlayer(nextPlayer);
              const availablePowerCount =
                (player
                  ? [...player.skills].filter((skill) => canActivatePower(player, skill)).length
                  : null) || 0;
              if (availablePowerCount > 0) {
                state = {
                  ...state,
                  animations: state.animations.set(new AnimationKey(), {
                    color: nextPlayer,
                    text: String(
                      fbt(
                        `A power is ready to be activated.`,
                        `A player's power is ready to be activated.`,
                      ),
                    ),
                    type: 'notice',
                  }),
                };
              }
            }

            return onComplete(state);
          };

          const [unitsToHeal, unitsToRefill] = isFake
            ? [emptyUnitHealMap, emptyUnitMap]
            : partitionUnitsToHeal(
                getUnitsToHeal(map, map.getPlayer(nextPlayer)).filter((_, vector) =>
                  vision.isVisible(map, vector),
                ),
              );
          const incomeEntries = isFake
            ? emptyIncomeEntries
            : getIncomeEntries(map, map.getPlayer(nextPlayer), vision);

          const poisonedUnits = isFake
            ? emptyUnitMap
            : map.units.filter(
                (unit, vector) =>
                  !unitsToHeal.has(vector) &&
                  isPoisoned(map, nextPlayer, unit) &&
                  vision.isVisible(map, vector),
              );
          const extraPositions = await maybeExtraPositions;
          const unitsToSupply = new Map([
            ...(isFake
              ? emptyUnitMap
              : getAllUnitsToRefill(newMap, vision, state.map.getPlayer(nextPlayer))),
            ...(extraPositions ? getUnitsByPositions(map, extraPositions) : []),
            ...unitsToRefill,
          ]);

          const removeUnits = (state: State) =>
            explodeUnits(
              actions,
              state,
              // Identify units that are out of fuel without applying the fuel adjustment, which is
              // applied later in `applyEndTurnActionResponse`.
              isFake
                ? []
                : sortVectors([
                    ...newMap.units
                      .filter(
                        (unit, vector) =>
                          !unitsToSupply.has(vector) &&
                          !unitsToHeal.has(vector) &&
                          vision.isVisible(map, vector) &&
                          shouldRemoveUnit(newMap, vector, unit, nextPlayer),
                      )
                      .keys(),
                  ]),
              complete,
            );

          const animatePoisonedUnits = (state: State) =>
            poisonedUnits.size
              ? animatePoison(state, sortByVectorKey(poisonedUnits), removeUnits)
              : removeUnits(state);

          const animateUnitRecovery = (state: State) =>
            animateHeal(state, sortByVectorKey(unitsToHeal), (state) =>
              unitsToSupply.size
                ? animateSupply(state, sortByVectorKey(unitsToSupply), animatePoisonedUnits)
                : animatePoisonedUnits(state),
            );

          await update(
            incomeEntries.length
              ? animateIncome(state, incomeEntries, nextPlayer, animateUnitRecovery)
              : animateUnitRecovery(state),
          );
        });

        return state;
      },
      player: nextPlayer,
      sound: 'UI/EndTurn',
      text: String(
        fbt(
          'Round ' +
            fbt.param('round', round) +
            ', ' +
            fbt.param('color', getTranslatedFactionName(state.playerDetails, nextPlayer)),
          `The banner text for the beginning of a player's turn.`,
        ),
      ),
      type: 'banner',
    }),
    behavior: new NullBehavior(),
    map: isFake
      ? state.map
      : getEndTurnIncomeStartMap(state.map.recover(currentPlayer), actionResponse),
  };
}
