import Decimal from 'break_eternity.js';
import type { GameState } from '../state';
import { DWELLERS, type DwellerDef } from '../data/dwellers';
import { isRemActive } from './events';

/** 全生産にかかる倍率（枕・実績・残滓・レム・悪夢デバフ） */
export function globalMultiplier(state: GameState, now: number): Decimal {
  const pillow = 1 + 0.1 * (state.memoryUpgrades['pillow'] ?? 0);
  const honey = 1 + 0.25 * (state.residueUpgrades['honey'] ?? 0);
  const achievement = 1 + 0.01 * state.achievements.length;
  let mult = new Decimal(pillow).mul(honey).mul(achievement);
  if (isRemActive(state, now)) mult = mult.mul(2);
  if (now < state.event.debuffUntil) mult = mult.mul(0.5);
  return mult;
}

/** 住人1種の毎秒生産（倍率込み） */
export function dwellerProdPerSec(state: GameState, def: DwellerDef, now: number): Decimal {
  const count = state.dwellers[def.id] ?? 0;
  if (count === 0) return new Decimal(0);
  return def.baseProd.mul(count).mul(globalMultiplier(state, now));
}

/** 全住人の毎秒生産合計 */
export function totalProdPerSec(state: GameState, now: number): Decimal {
  let base = new Decimal(0);
  for (const def of DWELLERS) {
    const count = state.dwellers[def.id] ?? 0;
    if (count > 0) base = base.add(def.baseProd.mul(count));
  }
  return base.mul(globalMultiplier(state, now));
}

/** タップ1回の獲得量。基礎1×栞倍率 + 毎秒生産の2% */
export function tapGain(state: GameState, now: number): Decimal {
  const shiori = Decimal.pow(2, state.memoryUpgrades['shiori'] ?? 0);
  return shiori.add(totalProdPerSec(state, now).mul(0.02));
}

/** 夢片を加算し、周回累計・全期間累計にも反映する */
export function gainFragments(state: GameState, amount: Decimal): void {
  state.fragments = state.fragments.add(amount);
  state.totalFragmentsThisSleep = state.totalFragmentsThisSleep.add(amount);
  state.stats.allTimeFragments = state.stats.allTimeFragments.add(amount);
}

/** 通常ティック: dt秒ぶんの生産を反映 */
export function tickProduction(state: GameState, dtSec: number, now: number): void {
  const prod = totalProdPerSec(state, now);
  if (prod.gt(0)) gainFragments(state, prod.mul(dtSec));
}
