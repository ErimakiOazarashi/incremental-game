import Decimal from 'break_eternity.js';
import { LAYERS } from './layers';

export interface DwellerDef {
  id: string;
  layerIndex: number;
  name: string;
  basePrice: Decimal;
  /** 1体あたりの毎秒生産（倍率適用前） */
  baseProd: Decimal;
  /** 購入ごとの価格上昇率 */
  costGrowth: number;
}

/** 階層内スロットごとの基準価格と基準生産 */
const SLOT_PRICES = [10, 1e3, 1e5, 1e8];
const SLOT_PRODS = [0.5, 25, 1500, 90000];

const NAMES: Record<number, string[]> = {
  1: ['ねむりひつじ', 'うたたね猫', '貝がらの夢喰い', '灯台守の影'],
  2: ['司書のフクロウ', '歩く百科事典', 'インクの精', '忘れられた著者'],
  3: ['逆さ歩きの人形', '屋根裏の商人', '鏡映りの市長', '時計塔の心臓'],
  4: ['発光クラゲ', '沈黙のセイレーン', '深海の図書魚', '眠る古代竜'],
  5: ['星屑の羊飼い', '彗星の遺児', '銀河の墓守', '眠れる巨人'],
};

export const DWELLERS: DwellerDef[] = LAYERS.flatMap((layer) =>
  NAMES[layer.index].map((name, slot) => ({
    id: `d${layer.index}_${slot}`,
    layerIndex: layer.index,
    name,
    basePrice: layer.priceScale.mul(SLOT_PRICES[slot]),
    baseProd: layer.priceScale.mul(SLOT_PRODS[slot]).mul(layer.prodBonus),
    costGrowth: 1.15,
  })),
);

export function dwellerById(id: string): DwellerDef {
  const def = DWELLERS.find((d) => d.id === id);
  if (!def) throw new Error(`unknown dweller: ${id}`);
  return def;
}

export function dwellersOfLayer(layerIndex: number): DwellerDef[] {
  return DWELLERS.filter((d) => d.layerIndex === layerIndex);
}
