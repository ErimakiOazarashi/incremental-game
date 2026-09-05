import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { createInitialState } from '../src/state';
import { serialize, deserialize, applyOfflineProgress, offlineEfficiency, OFFLINE_CAP_MS } from '../src/save';
import { formatDecimal, formatDuration } from '../src/ui/format';
import { dwellerById } from '../src/data/dwellers';

const NOW = 1_000_000_000;

describe('save', () => {
  it('シリアライズ往復で状態が保たれる', () => {
    const s = createInitialState(NOW);
    s.fragments = new Decimal('1.5e42');
    s.memories = new Decimal(123);
    s.dwellers['d2_1'] = 7;
    s.memoryUpgrades['pillow'] = 4;
    s.achievements.push('awaken_1');
    s.stats.totalTaps = 999;
    s.stats.allTimeFragments = new Decimal('9e99');
    const restored = deserialize(serialize(s), NOW + 1000);
    expect(restored.fragments.eq(s.fragments)).toBe(true);
    expect(restored.memories.eq(123)).toBe(true);
    expect(restored.dwellers['d2_1']).toBe(7);
    expect(restored.memoryUpgrades['pillow']).toBe(4);
    expect(restored.achievements).toContain('awaken_1');
    expect(restored.stats.totalTaps).toBe(999);
    expect(restored.stats.allTimeFragments.eq(new Decimal('9e99'))).toBe(true);
  });

  it('壊れたJSONは例外', () => {
    expect(() => deserialize('{oops', NOW)).toThrow();
  });

  it('フィールド欠損は初期値で補完される', () => {
    const restored = deserialize(JSON.stringify({ version: 1, state: { fragments: '50' } }), NOW);
    expect(restored.fragments.eq(50)).toBe(true);
    expect(restored.unlockedLayers).toBe(1);
    expect(restored.stats.totalTaps).toBe(0);
  });

  it('型不一致のフィールドは無視される', () => {
    const restored = deserialize(
      JSON.stringify({ version: 1, state: { unlockedLayers: 'five', nightmareResidue: 3 } }),
      NOW,
    );
    expect(restored.unlockedLayers).toBe(1);
    expect(restored.nightmareResidue).toBe(3);
  });
});

describe('offline progress', () => {
  it('経過時間×効率50%ぶん付与される', () => {
    const s = createInitialState(NOW - 300_000);
    s.dwellers['d1_0'] = 10; // 5/s（レム外を仮定しない: globalMultはremCycleStartに依存）
    s.lastSavedAt = NOW - 3600_000; // 1時間前
    const before = s.fragments;
    const result = applyOfflineProgress(s, NOW);
    expect(result.elapsedMs).toBe(3600_000);
    expect(s.fragments.gt(before)).toBe(true);
    expect(offlineEfficiency(s)).toBe(0.5);
  });

  it('経過が負なら付与0', () => {
    const s = createInitialState(NOW);
    s.dwellers['d1_0'] = 10;
    s.lastSavedAt = NOW + 100_000; // 時計巻き戻し
    const result = applyOfflineProgress(s, NOW);
    expect(result.elapsedMs).toBe(0);
    expect(result.gained.eq(0)).toBe(true);
  });

  it('12時間で頭打ち', () => {
    const s = createInitialState(NOW);
    s.dwellers['d1_0'] = 1;
    s.lastSavedAt = NOW - 100 * 3600_000;
    const result = applyOfflineProgress(s, NOW);
    expect(result.elapsedMs).toBe(OFFLINE_CAP_MS);
  });
});

describe('format', () => {
  it('小さい数はそのまま', () => {
    expect(formatDecimal(new Decimal(0))).toBe('0');
    expect(formatDecimal(new Decimal(1234))).toBe('1234');
  });

  it('日本語単位', () => {
    expect(formatDecimal(new Decimal(12_345), 'jp')).toBe('1.23万');
    expect(formatDecimal(new Decimal(5.6e12), 'jp')).toBe('5.60兆');
    expect(formatDecimal(new Decimal(7.89e16), 'jp')).toBe('7.89京');
  });

  it('科学表記', () => {
    expect(formatDecimal(new Decimal('1.234e45'), 'sci')).toBe('1.23e45');
  });

  it('jpでも1e72以上は科学表記へ', () => {
    expect(formatDecimal(new Decimal('1e80'), 'jp')).toMatch(/e80$/);
  });

  it('時間の整形', () => {
    expect(formatDuration(30_000)).toBe('30秒');
    expect(formatDuration(3_720_000)).toBe('1時間2分');
  });
});

describe('data integrity', () => {
  it('住人IDが引ける', () => {
    expect(dwellerById('d5_3').name).toBe('眠れる巨人');
  });
});
