import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { createInitialState } from '../src/state';
import { totalProdPerSec, gainFragments, tapGain } from '../src/logic/production';
import { buyDweller, canBuyDweller, canUnlockLayer, unlockLayer } from '../src/logic/purchase';
import { DWELLERS } from '../src/data/dwellers';
import { LAYERS } from '../src/data/layers';
import { memoriesOnAwaken } from '../src/logic/prestige';

/**
 * ペーシングの回帰テスト。
 * 「序盤はタップで押し、買えるものを貪欲に買う」プレイヤーを1秒刻みで模擬し、
 * 初回目覚めライン（累計1e6）への到達時間が想定レンジに収まることを確認する。
 */
describe('バランス: 初回周回のペーシング', () => {
  it('貪欲プレイで初記憶(累計1e6)まで5〜45分、L2解放まで15分以内', () => {
    const s = createInitialState(0);
    // レム・悪夢の影響を除いた素の速度で測る
    s.event.remCycleStart = -1e9;

    let firstMemorySec: number | null = null;
    let l2Sec: number | null = null;
    const MAX_SEC = 60 * 60;

    for (let t = 0; t < MAX_SEC; t++) {
      const now = t * 1000;
      // 序盤（累計1e4まで）は毎秒3タップで押す想定
      if (s.totalFragmentsThisSleep.lt(1e4)) {
        gainFragments(s, tapGain(s, now).mul(3));
        s.stats.totalTaps += 3;
      }
      gainFragments(s, totalProdPerSec(s, now));

      while (canUnlockLayer(s)) unlockLayer(s);
      // 次の階層解放が生産60秒ぶん以内なら貯金し、それ以外は買える住人を買う
      const nextCost = s.unlockedLayers < 5 ? LAYERS[s.unlockedLayers].unlockCost : null;
      const saving =
        nextCost !== null &&
        nextCost.sub(s.fragments).lte(totalProdPerSec(s, now).mul(60)) &&
        s.fragments.lt(nextCost);
      if (!saving) {
        let bought = true;
        while (bought) {
          bought = false;
          for (const def of DWELLERS) {
            if (def.layerIndex > s.unlockedLayers) break;
            if (canBuyDweller(s, def.id) && buyDweller(s, def.id)) bought = true;
          }
        }
      }

      if (l2Sec === null && s.unlockedLayers >= 2) l2Sec = t;
      if (firstMemorySec === null && memoriesOnAwaken(s.totalFragmentsThisSleep).gte(1)) {
        firstMemorySec = t;
        break;
      }
    }

    expect(l2Sec).not.toBeNull();
    expect(firstMemorySec).not.toBeNull();
    expect(l2Sec!).toBeLessThan(15 * 60);
    expect(firstMemorySec!).toBeGreaterThan(5 * 60);
    expect(firstMemorySec!).toBeLessThan(45 * 60);
  });

  it('記憶10個持ちの2周目は初回より大幅に速い', () => {
    const s = createInitialState(0);
    s.event.remCycleStart = -1e9;
    s.memoryUpgrades['pillow'] = 5; // ×1.5
    s.memoryUpgrades['shiori'] = 2; // タップ×4
    s.memoryUpgrades['incense'] = 1; // L2解放スタート
    s.unlockedLayers = 2;

    let firstMemorySec: number | null = null;
    for (let t = 0; t < 30 * 60; t++) {
      const now = t * 1000;
      if (s.totalFragmentsThisSleep.lt(1e4)) {
        gainFragments(s, tapGain(s, now).mul(3));
      }
      gainFragments(s, totalProdPerSec(s, now));
      while (canUnlockLayer(s)) unlockLayer(s);
      let bought = true;
      while (bought) {
        bought = false;
        for (const def of DWELLERS) {
          if (def.layerIndex > s.unlockedLayers) break;
          if (canBuyDweller(s, def.id) && buyDweller(s, def.id)) bought = true;
        }
      }
      if (memoriesOnAwaken(s.totalFragmentsThisSleep).gte(1)) {
        firstMemorySec = t;
        break;
      }
    }
    expect(firstMemorySec).not.toBeNull();
    expect(firstMemorySec!).toBeLessThan(12 * 60);
  });

  it('住人の価格と生産に負の値・NaNがない', () => {
    for (const def of DWELLERS) {
      expect(def.basePrice.gt(0)).toBe(true);
      expect(def.baseProd.gt(0)).toBe(true);
      expect(Number.isNaN(def.basePrice.toNumber())).toBe(false);
    }
    expect(new Decimal(1).eq(1)).toBe(true);
  });
});
