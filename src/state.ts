import Decimal from 'break_eternity.js';

/** 進行中の悪夢イベント */
export interface NightmareState {
  /** この時刻までに祓えないと失敗（エポックms） */
  expiresAt: number;
  /** 祓うのに必要な残りクリック数 */
  clicksLeft: number;
}

export interface EventState {
  /** レムサイクルの基準時刻（エポックms） */
  remCycleStart: number;
  /** 次の悪夢の出現予定時刻（エポックms） */
  nextNightmareAt: number;
  /** 出現中の悪夢。null なら不在 */
  nightmare: NightmareState | null;
  /** 悪夢失敗デバフの終了時刻（エポックms）。過去なら無効 */
  debuffUntil: number;
}

export interface Stats {
  totalAwakenings: number;
  totalNightmaresBanished: number;
  totalTaps: number;
  totalDwellersBought: number;
  /** 全周回を通した夢片の累計獲得量 */
  allTimeFragments: Decimal;
  /** 全周回を通した記憶の累計獲得量 */
  allTimeMemories: Decimal;
}

export interface GameState {
  /** 現在の夢片 */
  fragments: Decimal;
  /** 今回の眠り（周回）で稼いだ夢片の累計。記憶の計算に使う */
  totalFragmentsThisSleep: Decimal;
  /** 記憶（プレステージ通貨） */
  memories: Decimal;
  /** 悪夢の残滓 */
  nightmareResidue: number;
  /** 解放済みの最深階層（1〜5） */
  unlockedLayers: number;
  /** 住人ID → 所持数 */
  dwellers: Record<string, number>;
  /** 記憶アップグレードID → レベル */
  memoryUpgrades: Record<string, number>;
  /** 残滓アップグレードID → レベル */
  residueUpgrades: Record<string, number>;
  /** 達成済み実績ID */
  achievements: string[];
  stats: Stats;
  event: EventState;
  settings: {
    /** 大数表記: 科学表記 or 日本語単位 */
    notation: 'sci' | 'jp';
  };
  /** 最終セーブ時刻（エポックms）。オフライン進行の起点 */
  lastSavedAt: number;
}

export function createInitialState(now: number): GameState {
  return {
    fragments: new Decimal(0),
    totalFragmentsThisSleep: new Decimal(0),
    memories: new Decimal(0),
    nightmareResidue: 0,
    unlockedLayers: 1,
    dwellers: {},
    memoryUpgrades: {},
    residueUpgrades: {},
    achievements: [],
    stats: {
      totalAwakenings: 0,
      totalNightmaresBanished: 0,
      totalTaps: 0,
      totalDwellersBought: 0,
      allTimeFragments: new Decimal(0),
      allTimeMemories: new Decimal(0),
    },
    event: {
      remCycleStart: now,
      nextNightmareAt: 0,
      nightmare: null,
      debuffUntil: 0,
    },
    settings: { notation: 'jp' },
    lastSavedAt: now,
  };
}
