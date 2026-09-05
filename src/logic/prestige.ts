import Decimal from 'break_eternity.js';
import type { GameState } from '../state';

/** 今回の眠りの累計夢片から得られる記憶。floor(sqrt(total / 1e6)) */
export function memoriesOnAwaken(totalFragmentsThisSleep: Decimal): Decimal {
  const base = totalFragmentsThisSleep.div(1e6);
  if (base.lt(1)) return new Decimal(0);
  return base.sqrt().floor();
}

/** 眠り始めに解放されている階層数（深い眠りの香りの効果） */
export function startingLayers(state: GameState): number {
  return 1 + (state.memoryUpgrades['incense'] ?? 0);
}

/**
 * 目覚める。夢の中の進行をリセットし、記憶を持ち帰る。
 * 記憶が0でも目覚め自体は可能（UIで警告する）。
 */
export function awaken(state: GameState, now: number): Decimal {
  const gained = memoriesOnAwaken(state.totalFragmentsThisSleep);
  state.memories = state.memories.add(gained);
  state.stats.allTimeMemories = state.stats.allTimeMemories.add(gained);
  state.stats.totalAwakenings += 1;

  state.fragments = new Decimal(0);
  state.totalFragmentsThisSleep = new Decimal(0);
  state.dwellers = {};
  state.unlockedLayers = startingLayers(state);

  state.event.remCycleStart = now;
  state.event.nightmare = null;
  state.event.debuffUntil = 0;
  state.event.nextNightmareAt = 0; // 次のティックで再抽選される

  return gained;
}
