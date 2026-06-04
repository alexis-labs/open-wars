import * as Buildings from '@deities/athena/info/Building.tsx';
import { BuildingInfo } from '@deities/athena/info/Building.tsx';
import * as Units from '@deities/athena/info/Unit.tsx';
import { UnitInfo } from '@deities/athena/info/Unit.tsx';

function collectInfoSymbols(
  module: Record<string, unknown>,
  InfoClass: typeof BuildingInfo | typeof UnitInfo,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const [name, value] of Object.entries(module)) {
    if (value instanceof InfoClass) {
      map.set(value.id, name);
    }
  }
  return map;
}

export const buildingIdToSymbol = collectInfoSymbols(Buildings, BuildingInfo);
export const unitIdToSymbol = collectInfoSymbols(Units, UnitInfo);

export function buildingSymbol(id: number): string {
  return `${buildingIdToSymbol.get(id) || 'UnknownBuilding'}.id`;
}

export function unitSymbol(id: number): string {
  return `${unitIdToSymbol.get(id) || 'UnknownUnit'}.id`;
}
