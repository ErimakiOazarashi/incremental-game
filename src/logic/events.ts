import type { GameState } from '../state';

export const REM_PERIOD_MS = 600_000; // 10分周期
export const REM_BASE_DURATION_MS = 90_000; // 基礎90秒
export const REM_EXTENSION_MS = 30_000; // 目覚まし破壊1Lvごとの延長
export const NIGHTMARE_TIME_LIMIT_MS = 60_000;
export const NIGHTMARE_DEBUFF_MS = 90_000;
export const NIGHTMARE_CLICKS = 20;
const NIGHTMARE_MIN_INTERVAL_MS = 180_000;
const NIGHTMARE_MAX_INTERVAL_MS = 480_000;

export function remDurationMs(state: GameState): number {
  return REM_BASE_DURATION_MS + REM_EXTENSION_MS * (state.memoryUpgrades['alarm'] ?? 0);
}

export function isRemActive(state: GameState, now: number): boolean {
  const elapsed = now - state.event.remCycleStart;
  if (elapsed < 0) return false;
  return elapsed % REM_PERIOD_MS < remDurationMs(state);
}

/** 次のレムサイクル開始までのms（アクティブ中なら残り時間を負で返さず0） */
export function msUntilNextRem(state: GameState, now: number): number {
  const elapsed = now - state.event.remCycleStart;
  const inCycle = ((elapsed % REM_PERIOD_MS) + REM_PERIOD_MS) % REM_PERIOD_MS;
  return isRemActive(state, now) ? 0 : REM_PERIOD_MS - inCycle;
}

export function scheduleNextNightmare(state: GameState, now: number, rand: () => number = Math.random): void {
  const range = NIGHTMARE_MAX_INTERVAL_MS - NIGHTMARE_MIN_INTERVAL_MS;
  let interval = NIGHTMARE_MIN_INTERVAL_MS + rand() * range;
  if ((state.residueUpgrades['abysseye'] ?? 0) > 0) interval /= 2;
  state.event.nextNightmareAt = now + interval;
}

/** 悪夢を祓ったときの残滓獲得量 */
export function residueReward(state: GameState): number {
  let reward = 1;
  if ((state.residueUpgrades['abysseye'] ?? 0) > 0) reward += 1;
  if (state.unlockedLayers >= 4) reward += 1;
  return reward;
}

function banish(state: GameState, now: number): void {
  state.nightmareResidue += residueReward(state);
  state.stats.totalNightmaresBanished += 1;
  state.event.nightmare = null;
  scheduleNextNightmare(state, now);
}

/** 出現中の悪夢をクリックで祓う。祓いきったら true */
export function clickNightmare(state: GameState, now: number): boolean {
  const nm = state.event.nightmare;
  if (!nm) return false;
  nm.clicksLeft -= 1;
  if (nm.clicksLeft <= 0) {
    banish(state, now);
    return true;
  }
  return false;
}

/** 悪夢の出現・時間切れ処理。毎ティック呼ぶ */
export function tickNightmare(state: GameState, now: number): void {
  const nm = state.event.nightmare;
  if (nm) {
    if (now >= nm.expiresAt) {
      // 祓えなかった: 生産デバフ
      state.event.nightmare = null;
      state.event.debuffUntil = now + NIGHTMARE_DEBUFF_MS;
      scheduleNextNightmare(state, now);
    }
    return;
  }
  if (state.event.nextNightmareAt === 0) {
    scheduleNextNightmare(state, now);
    return;
  }
  if (now >= state.event.nextNightmareAt) {
    if ((state.residueUpgrades['watchdog'] ?? 0) > 0) {
      // 夢の番犬が即座に祓う
      state.event.nightmare = { expiresAt: now, clicksLeft: 0 };
      banish(state, now);
      return;
    }
    state.event.nightmare = {
      expiresAt: now + NIGHTMARE_TIME_LIMIT_MS,
      clicksLeft: NIGHTMARE_CLICKS,
    };
  }
}
