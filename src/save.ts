import Decimal from 'break_eternity.js';
import { createInitialState, type GameState } from './state';
import { totalProdPerSec, gainFragments } from './logic/production';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'nemuriNoAto.save';
export const BACKUP_KEY = 'nemuriNoAto.save.bak';

/** オフライン進行の上限12時間 */
export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1000;

interface SavePayload {
  version: number;
  state: unknown;
}

const DECIMAL_FIELDS = ['fragments', 'totalFragmentsThisSleep', 'memories'] as const;
const DECIMAL_STAT_FIELDS = ['allTimeFragments', 'allTimeMemories'] as const;

export function serialize(state: GameState): string {
  const raw: Record<string, unknown> = { ...state };
  for (const f of DECIMAL_FIELDS) raw[f] = state[f].toString();
  raw['stats'] = {
    ...state.stats,
    allTimeFragments: state.stats.allTimeFragments.toString(),
    allTimeMemories: state.stats.allTimeMemories.toString(),
  };
  const payload: SavePayload = { version: SAVE_VERSION, state: raw };
  return JSON.stringify(payload);
}

/** パース不能・形式不正なら例外を投げる */
export function deserialize(json: string, now: number): GameState {
  const payload = JSON.parse(json) as SavePayload;
  if (typeof payload.version !== 'number' || typeof payload.state !== 'object' || payload.state === null) {
    throw new Error('invalid save format');
  }
  const migrated = migrate(payload);
  const raw = migrated.state as Record<string, unknown>;

  // 初期状態をベースに既知フィールドだけ取り込む（未知の破損キーを無視）
  const state = createInitialState(now);
  const assign = <K extends keyof GameState>(key: K, value: GameState[K]) => {
    state[key] = value;
  };

  for (const f of DECIMAL_FIELDS) {
    if (typeof raw[f] === 'string') state[f] = new Decimal(raw[f] as string);
  }
  if (typeof raw['nightmareResidue'] === 'number') assign('nightmareResidue', raw['nightmareResidue'] as number);
  if (typeof raw['unlockedLayers'] === 'number') assign('unlockedLayers', raw['unlockedLayers'] as number);
  if (raw['dwellers'] && typeof raw['dwellers'] === 'object') assign('dwellers', raw['dwellers'] as Record<string, number>);
  if (raw['memoryUpgrades'] && typeof raw['memoryUpgrades'] === 'object') assign('memoryUpgrades', raw['memoryUpgrades'] as Record<string, number>);
  if (raw['residueUpgrades'] && typeof raw['residueUpgrades'] === 'object') assign('residueUpgrades', raw['residueUpgrades'] as Record<string, number>);
  if (Array.isArray(raw['achievements'])) assign('achievements', (raw['achievements'] as unknown[]).filter((a): a is string => typeof a === 'string'));
  if (typeof raw['lastSavedAt'] === 'number') assign('lastSavedAt', raw['lastSavedAt'] as number);

  const stats = raw['stats'] as Record<string, unknown> | undefined;
  if (stats) {
    for (const f of ['totalAwakenings', 'totalNightmaresBanished', 'totalTaps', 'totalDwellersBought'] as const) {
      if (typeof stats[f] === 'number') state.stats[f] = stats[f] as number;
    }
    for (const f of DECIMAL_STAT_FIELDS) {
      if (typeof stats[f] === 'string') state.stats[f] = new Decimal(stats[f] as string);
    }
  }

  const event = raw['event'] as Record<string, unknown> | undefined;
  if (event) {
    if (typeof event['remCycleStart'] === 'number') state.event.remCycleStart = event['remCycleStart'] as number;
    if (typeof event['debuffUntil'] === 'number') state.event.debuffUntil = event['debuffUntil'] as number;
    // 悪夢と出現予定はロード時にリセット（オフラインを跨ぐ悪夢は成立しない）
    state.event.nightmare = null;
    state.event.nextNightmareAt = 0;
  }

  const settings = raw['settings'] as Record<string, unknown> | undefined;
  if (settings && (settings['notation'] === 'sci' || settings['notation'] === 'jp')) {
    state.settings.notation = settings['notation'];
  }
  return state;
}

/** 将来のバージョン移行はここに連鎖させる */
function migrate(payload: SavePayload): SavePayload {
  return payload;
}

export function offlineEfficiency(state: GameState): number {
  return 0.5 + 0.25 * (state.memoryUpgrades['bedding'] ?? 0);
}

export interface OfflineResult {
  gained: Decimal;
  elapsedMs: number;
}

/**
 * オフライン進行を適用する。経過が負（時計巻き戻し）なら0扱い。
 * 戻り値はUI表示用。
 */
export function applyOfflineProgress(state: GameState, now: number): OfflineResult {
  const elapsedMs = Math.min(Math.max(now - state.lastSavedAt, 0), OFFLINE_CAP_MS);
  const prod = totalProdPerSec(state, now);
  const gained = prod.mul(elapsedMs / 1000).mul(offlineEfficiency(state));
  if (gained.gt(0)) gainFragments(state, gained);
  return { gained, elapsedMs };
}

function storageAvailable(): boolean {
  try {
    const k = '__nemuri_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export const hasStorage = storageAvailable();

/** 現行セーブをバックアップに退避してから保存する */
export function saveToStorage(state: GameState, now: number): void {
  if (!hasStorage) return;
  state.lastSavedAt = now;
  try {
    const current = localStorage.getItem(SAVE_KEY);
    if (current !== null) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    // 容量超過等は無視（次回保存で再試行）
  }
}

export interface LoadResult {
  state: GameState;
  usedBackup: boolean;
  /** 破損していて読めなかった生データ（ユーザー救出用） */
  corruptData: string | null;
}

export function loadFromStorage(now: number): LoadResult | null {
  if (!hasStorage) return null;
  const main = localStorage.getItem(SAVE_KEY);
  if (main === null) return null;
  try {
    return { state: deserialize(main, now), usedBackup: false, corruptData: null };
  } catch {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup !== null) {
      try {
        return { state: deserialize(backup, now), usedBackup: true, corruptData: main };
      } catch {
        // 両方破損
      }
    }
    return { state: createInitialState(now), usedBackup: false, corruptData: main };
  }
}

/** エクスポート文字列（base64） */
export function exportSave(state: GameState): string {
  return btoa(unescape(encodeURIComponent(serialize(state))));
}

export function importSave(text: string, now: number): GameState {
  return deserialize(decodeURIComponent(escape(atob(text.trim()))), now);
}
