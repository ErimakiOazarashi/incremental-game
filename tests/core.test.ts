import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { createInitialState } from '../src/state';
import { dwellerById } from '../src/data/dwellers';
import { totalProdPerSec, tickProduction, globalMultiplier, tapGain } from '../src/logic/production';
import { dwellerPrice, buyDweller, unlockLayer, canUnlockLayer, buyUpgrade, autoBuyDwellers } from '../src/logic/purchase';
import { memoriesOnAwaken, awaken } from '../src/logic/prestige';
import { upgradeById } from '../src/data/upgrades';

const NOW = 1_000_000_000;

// レムサイクルの影響を受けない時刻（起動直後はレム中なので周期の後半へずらす）
function calmState() {
  const s = createInitialState(NOW - 300_000);
  return s;
}

describe('production', () => {
  it('住人がいなければ生産0', () => {
    const s = calmState();
    expect(totalProdPerSec(s, NOW).eq(0)).toBe(true);
  });

  it('住人1体の生産が反映される', () => {
    const s = calmState();
    s.dwellers['d1_0'] = 1;
    const def = dwellerById('d1_0');
    expect(totalProdPerSec(s, NOW).eq(def.baseProd)).toBe(true);
  });

  it('tickProductionでdt秒ぶん夢片が増える', () => {
    const s = calmState();
    s.dwellers['d1_0'] = 2;
    tickProduction(s, 10, NOW);
    const expected = dwellerById('d1_0').baseProd.mul(2).mul(10);
    expect(s.fragments.eq(expected)).toBe(true);
    expect(s.totalFragmentsThisSleep.eq(expected)).toBe(true);
    expect(s.stats.allTimeFragments.eq(expected)).toBe(true);
  });

  it('枕Lv3で倍率1.3', () => {
    const s = calmState();
    s.memoryUpgrades['pillow'] = 3;
    expect(globalMultiplier(s, NOW).toNumber()).toBeCloseTo(1.3);
  });

  it('悪夢デバフ中は半減', () => {
    const s = calmState();
    s.event.debuffUntil = NOW + 1000;
    expect(globalMultiplier(s, NOW).toNumber()).toBeCloseTo(0.5);
  });

  it('タップは基礎1 + 生産の2%', () => {
    const s = calmState();
    s.dwellers['d1_1'] = 4; // 25×4 = 100/s
    expect(tapGain(s, NOW).toNumber()).toBeCloseTo(1 + 2);
  });
});

describe('purchase', () => {
  it('価格は1.15の等比で上昇', () => {
    const def = dwellerById('d1_0');
    expect(dwellerPrice(def, 0).eq(def.basePrice)).toBe(true);
    expect(dwellerPrice(def, 2).toNumber()).toBeCloseTo(def.basePrice.toNumber() * 1.15 ** 2);
  });

  it('夢片が足りなければ買えない', () => {
    const s = calmState();
    expect(buyDweller(s, 'd1_0')).toBe(false);
  });

  it('購入で夢片が減り所持数が増える', () => {
    const s = calmState();
    s.fragments = new Decimal(100);
    expect(buyDweller(s, 'd1_0')).toBe(true);
    expect(s.dwellers['d1_0']).toBe(1);
    expect(s.fragments.toNumber()).toBeCloseTo(90);
    expect(s.stats.totalDwellersBought).toBe(1);
  });

  it('未解放階層の住人は買えない', () => {
    const s = calmState();
    s.fragments = new Decimal(1e30);
    expect(buyDweller(s, 'd2_0')).toBe(false);
  });

  it('階層解放にはコストがかかる', () => {
    const s = calmState();
    expect(canUnlockLayer(s)).toBe(false);
    s.fragments = new Decimal(1e4);
    expect(unlockLayer(s)).toBe(true);
    expect(s.unlockedLayers).toBe(2);
    expect(s.fragments.eq(0)).toBe(true);
  });

  it('明晰夢Lv1でL1住人を自動購入する', () => {
    const s = calmState();
    s.memoryUpgrades['lucid'] = 1;
    s.fragments = new Decimal(100);
    autoBuyDwellers(s);
    expect((s.dwellers['d1_0'] ?? 0) > 0).toBe(true);
  });
});

describe('prestige', () => {
  it('記憶の計算: floor(sqrt(total/1e6))', () => {
    expect(memoriesOnAwaken(new Decimal(0)).eq(0)).toBe(true);
    expect(memoriesOnAwaken(new Decimal(999_999)).eq(0)).toBe(true);
    expect(memoriesOnAwaken(new Decimal(1e6)).eq(1)).toBe(true);
    expect(memoriesOnAwaken(new Decimal(4e6)).eq(2)).toBe(true);
    expect(memoriesOnAwaken(new Decimal(1e8)).eq(10)).toBe(true);
  });

  it('目覚めで夢の中身はリセット、記憶は加算', () => {
    const s = calmState();
    s.totalFragmentsThisSleep = new Decimal(4e6);
    s.fragments = new Decimal(12345);
    s.dwellers['d1_0'] = 5;
    s.unlockedLayers = 3;
    const gained = awaken(s, NOW);
    expect(gained.eq(2)).toBe(true);
    expect(s.memories.eq(2)).toBe(true);
    expect(s.fragments.eq(0)).toBe(true);
    expect(s.dwellers['d1_0']).toBeUndefined();
    expect(s.unlockedLayers).toBe(1);
    expect(s.stats.totalAwakenings).toBe(1);
  });

  it('香りLv2なら目覚め後も階層3まで解放済み', () => {
    const s = calmState();
    s.memoryUpgrades['incense'] = 2;
    s.unlockedLayers = 5;
    awaken(s, NOW);
    expect(s.unlockedLayers).toBe(3);
  });

  it('記憶ショップ購入で記憶が減りレベルが上がる', () => {
    const s = calmState();
    s.memories = new Decimal(3);
    const pillow = upgradeById('pillow');
    expect(buyUpgrade(s, pillow)).toBe(true); // cost 1
    expect(buyUpgrade(s, pillow)).toBe(true); // cost 2
    expect(buyUpgrade(s, pillow)).toBe(false); // cost 4 > 残0
    expect(s.memoryUpgrades['pillow']).toBe(2);
    expect(s.memories.eq(0)).toBe(true);
  });
});
