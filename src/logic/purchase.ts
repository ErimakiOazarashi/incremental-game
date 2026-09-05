import Decimal from 'break_eternity.js';
import type { GameState } from '../state';
import { dwellerById, dwellersOfLayer, type DwellerDef } from '../data/dwellers';
import { layerByIndex, LAYERS } from '../data/layers';
import { MEMORY_UPGRADES, RESIDUE_UPGRADES, type UpgradeDef } from '../data/upgrades';

/** 所持数 count 体目の次の1体の価格 */
export function dwellerPrice(def: DwellerDef, count: number): Decimal {
  return def.basePrice.mul(Decimal.pow(def.costGrowth, count));
}

export function canBuyDweller(state: GameState, id: string): boolean {
  const def = dwellerById(id);
  return (
    def.layerIndex <= state.unlockedLayers &&
    state.fragments.gte(dwellerPrice(def, state.dwellers[id] ?? 0))
  );
}

export function buyDweller(state: GameState, id: string): boolean {
  if (!canBuyDweller(state, id)) return false;
  const def = dwellerById(id);
  const count = state.dwellers[id] ?? 0;
  state.fragments = state.fragments.sub(dwellerPrice(def, count));
  state.dwellers[id] = count + 1;
  state.stats.totalDwellersBought += 1;
  return true;
}

/** 次に解放できる階層。すべて解放済みなら null */
export function nextLayerToUnlock(state: GameState): number | null {
  return state.unlockedLayers < LAYERS.length ? state.unlockedLayers + 1 : null;
}

export function canUnlockLayer(state: GameState): boolean {
  const next = nextLayerToUnlock(state);
  return next !== null && state.fragments.gte(layerByIndex(next).unlockCost);
}

export function unlockLayer(state: GameState): boolean {
  if (!canUnlockLayer(state)) return false;
  const next = nextLayerToUnlock(state)!;
  state.fragments = state.fragments.sub(layerByIndex(next).unlockCost);
  state.unlockedLayers = next;
  return true;
}

function levels(state: GameState, def: UpgradeDef): Record<string, number> {
  return MEMORY_UPGRADES.includes(def) ? state.memoryUpgrades : state.residueUpgrades;
}

function currency(state: GameState, def: UpgradeDef): Decimal {
  return MEMORY_UPGRADES.includes(def)
    ? state.memories
    : new Decimal(state.nightmareResidue);
}

export function canBuyUpgrade(state: GameState, def: UpgradeDef): boolean {
  const lv = levels(state, def)[def.id] ?? 0;
  return lv < def.maxLv && currency(state, def).gte(def.cost(lv));
}

export function buyUpgrade(state: GameState, def: UpgradeDef): boolean {
  if (!canBuyUpgrade(state, def)) return false;
  const lv = levels(state, def)[def.id] ?? 0;
  const cost = def.cost(lv);
  if (MEMORY_UPGRADES.includes(def)) {
    state.memories = state.memories.sub(cost);
  } else if (RESIDUE_UPGRADES.includes(def)) {
    state.nightmareResidue -= cost.toNumber();
  }
  levels(state, def)[def.id] = lv + 1;
  return true;
}

/** 明晰夢の訓練: 解放済み階層のうち自動購入対象の住人を、安い順に買えるだけ買う */
export function autoBuyDwellers(state: GameState): void {
  const lucidLv = state.memoryUpgrades['lucid'] ?? 0;
  if (lucidLv === 0) return;
  const maxLayer = Math.min(lucidLv, state.unlockedLayers);
  // 1ティックあたりの購入数を制限して指数コスト計算の暴走を防ぐ
  for (let i = 0; i < 50; i++) {
    let cheapest: { id: string; price: Decimal } | null = null;
    for (const layer of LAYERS) {
      if (layer.index > maxLayer) break;
      for (const def of dwellersOfLayer(layer.index)) {
        const price = dwellerPrice(def, state.dwellers[def.id] ?? 0);
        if (state.fragments.gte(price) && (cheapest === null || price.lt(cheapest.price))) {
          cheapest = { id: def.id, price };
        }
      }
    }
    if (!cheapest) return;
    buyDweller(state, cheapest.id);
  }
}
