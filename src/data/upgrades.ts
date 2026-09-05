import Decimal from 'break_eternity.js';

export interface UpgradeDef {
  id: string;
  name: string;
  desc: (lv: number) => string;
  maxLv: number;
  /** 次のレベル（現在lv → lv+1）のコスト */
  cost: (lv: number) => Decimal;
}

/** 記憶ショップ（目覚めても失われない永続強化） */
export const MEMORY_UPGRADES: UpgradeDef[] = [
  {
    id: 'pillow',
    name: 'ふかふかの枕',
    desc: (lv) => `全生産 ×${(1 + 0.1 * lv).toFixed(1)} → ×${(1 + 0.1 * (lv + 1)).toFixed(1)}`,
    maxLv: Number.MAX_SAFE_INTEGER,
    cost: (lv) => Decimal.pow(2, lv),
  },
  {
    id: 'incense',
    name: '深い眠りの香り',
    desc: (lv) => `眠り始めに階層${lv + 1}まで解放済みになる → 階層${lv + 2}まで`,
    maxLv: 3,
    cost: (lv) => Decimal.pow(5, lv + 1),
  },
  {
    id: 'shiori',
    name: '夢の栞',
    desc: (lv) => `タップ獲得 ×${Math.pow(2, lv)} → ×${Math.pow(2, lv + 1)}`,
    maxLv: 8,
    cost: (lv) => Decimal.pow(3, lv + 1),
  },
  {
    id: 'lucid',
    name: '明晰夢の訓練',
    desc: (lv) => `階層${lv + 1}の住人を自動購入する（現在: 階層${lv}まで）`,
    maxLv: 5,
    cost: (lv) => Decimal.pow(3, lv).mul(10),
  },
  {
    id: 'bedding',
    name: '安眠の寝具',
    desc: (lv) => `オフライン進行効率 ${50 + 25 * lv}% → ${50 + 25 * (lv + 1)}%`,
    maxLv: 2,
    cost: (lv) => Decimal.pow(4, lv + 1),
  },
  {
    id: 'alarm',
    name: '目覚まし時計の破壊',
    desc: (lv) => `レムサイクルのバフ時間 ${90 + 30 * lv}秒 → ${90 + 30 * (lv + 1)}秒`,
    maxLv: 3,
    cost: (lv) => Decimal.pow(6, lv + 1),
  },
];

/** 悪夢の残滓ショップ */
export const RESIDUE_UPGRADES: UpgradeDef[] = [
  {
    id: 'honey',
    name: '悪夢の蜜',
    desc: (lv) => `全生産 ×${(1 + 0.25 * lv).toFixed(2)} → ×${(1 + 0.25 * (lv + 1)).toFixed(2)}`,
    maxLv: 10,
    cost: (lv) => Decimal.pow(2, lv).mul(3),
  },
  {
    id: 'watchdog',
    name: '夢の番犬',
    desc: () => '出現した悪夢を自動で祓う',
    maxLv: 1,
    cost: () => new Decimal(10),
  },
  {
    id: 'abysseye',
    name: '深淵の瞳',
    desc: () => '悪夢の出現頻度2倍・祓ったときの残滓 +1',
    maxLv: 1,
    cost: () => new Decimal(5),
  },
];

export function upgradeById(id: string): UpgradeDef {
  const def = [...MEMORY_UPGRADES, ...RESIDUE_UPGRADES].find((u) => u.id === id);
  if (!def) throw new Error(`unknown upgrade: ${id}`);
  return def;
}
