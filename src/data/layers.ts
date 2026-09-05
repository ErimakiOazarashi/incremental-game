import Decimal from 'break_eternity.js';

export interface LayerDef {
  /** 1始まりの階層番号 */
  index: number;
  name: string;
  flavor: string;
  /** 解放に必要な夢片 */
  unlockCost: Decimal;
  /** 演出上の時間加速倍率（深いほど夢内時間が速い） */
  timeAccel: number;
  /** この階層の住人の価格スケール */
  priceScale: Decimal;
  /** この階層の住人の生産ボーナス（価格スケールとは別掛け） */
  prodBonus: number;
}

export const LAYERS: LayerDef[] = [
  {
    index: 1,
    name: 'まどろみの浜辺',
    flavor: '眠りに落ちた者が最初に流れ着く、ぬるい波の岸辺。',
    unlockCost: new Decimal(0),
    timeAccel: 1,
    priceScale: new Decimal(1),
    prodBonus: 1,
  },
  {
    index: 2,
    name: '記憶の図書館',
    flavor: '読んだ覚えのない本ばかりが並ぶ。頁をめくる音だけが響く。',
    unlockCost: new Decimal(1e4),
    timeAccel: 8,
    priceScale: new Decimal(1e3),
    prodBonus: 2,
  },
  {
    index: 3,
    name: '逆さの都市',
    flavor: '空に根を張る街。住人は落ちないのではなく、落ち続けている。',
    unlockCost: new Decimal(1e7),
    timeAccel: 64,
    priceScale: new Decimal(1e6),
    prodBonus: 4,
  },
  {
    index: 4,
    name: '静寂の深海',
    flavor: '音が生まれる前の海。光るものだけが言葉を持つ。',
    unlockCost: new Decimal(1e11),
    timeAccel: 512,
    priceScale: new Decimal(1e10),
    prodBonus: 8,
  },
  {
    index: 5,
    name: '星の墓場',
    flavor: '燃え尽きた星々が眠る場所。夢の底はまだ、この先にある。',
    unlockCost: new Decimal(1e16),
    timeAccel: 4096,
    priceScale: new Decimal(1e15),
    prodBonus: 16,
  },
];

export function layerByIndex(index: number): LayerDef {
  const def = LAYERS[index - 1];
  if (!def) throw new Error(`unknown layer: ${index}`);
  return def;
}
