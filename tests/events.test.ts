import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state';
import {
  isRemActive,
  msUntilNextRem,
  remDurationMs,
  scheduleNextNightmare,
  tickNightmare,
  clickNightmare,
  residueReward,
  REM_PERIOD_MS,
  NIGHTMARE_CLICKS,
  NIGHTMARE_TIME_LIMIT_MS,
  NIGHTMARE_DEBUFF_MS,
} from '../src/logic/events';

const NOW = 1_000_000_000;

describe('REMサイクル', () => {
  it('開始直後はアクティブ、90秒を過ぎると非アクティブ', () => {
    const s = createInitialState(NOW);
    expect(isRemActive(s, NOW)).toBe(true);
    expect(isRemActive(s, NOW + 89_000)).toBe(true);
    expect(isRemActive(s, NOW + 91_000)).toBe(false);
    // 次の周期で再びアクティブ
    expect(isRemActive(s, NOW + REM_PERIOD_MS + 10_000)).toBe(true);
  });

  it('目覚まし破壊Lvで延長される', () => {
    const s = createInitialState(NOW);
    expect(remDurationMs(s)).toBe(90_000);
    s.memoryUpgrades['alarm'] = 2;
    expect(remDurationMs(s)).toBe(150_000);
    expect(isRemActive(s, NOW + 140_000)).toBe(true);
  });

  it('次のレムまでの残り時間', () => {
    const s = createInitialState(NOW);
    expect(msUntilNextRem(s, NOW)).toBe(0); // アクティブ中
    expect(msUntilNextRem(s, NOW + 100_000)).toBe(REM_PERIOD_MS - 100_000);
  });
});

describe('悪夢', () => {
  it('予定時刻になると出現する', () => {
    const s = createInitialState(NOW);
    scheduleNextNightmare(s, NOW, () => 0); // 最短3分後
    expect(s.event.nextNightmareAt).toBe(NOW + 180_000);
    tickNightmare(s, NOW + 180_000);
    expect(s.event.nightmare).not.toBeNull();
    expect(s.event.nightmare!.clicksLeft).toBe(NIGHTMARE_CLICKS);
  });

  it('クリックで祓うと残滓を得て次が予約される', () => {
    const s = createInitialState(NOW);
    s.event.nightmare = { expiresAt: NOW + NIGHTMARE_TIME_LIMIT_MS, clicksLeft: 2 };
    expect(clickNightmare(s, NOW)).toBe(false);
    expect(clickNightmare(s, NOW)).toBe(true);
    expect(s.event.nightmare).toBeNull();
    expect(s.nightmareResidue).toBe(1);
    expect(s.stats.totalNightmaresBanished).toBe(1);
    expect(s.event.nextNightmareAt).toBeGreaterThan(NOW);
  });

  it('時間切れでデバフが付く', () => {
    const s = createInitialState(NOW);
    s.event.nightmare = { expiresAt: NOW + 1000, clicksLeft: 20 };
    tickNightmare(s, NOW + 1001);
    expect(s.event.nightmare).toBeNull();
    expect(s.event.debuffUntil).toBe(NOW + 1001 + NIGHTMARE_DEBUFF_MS);
  });

  it('夢の番犬は出現と同時に自動で祓う', () => {
    const s = createInitialState(NOW);
    s.residueUpgrades['watchdog'] = 1;
    s.event.nextNightmareAt = NOW;
    tickNightmare(s, NOW);
    expect(s.event.nightmare).toBeNull();
    expect(s.stats.totalNightmaresBanished).toBe(1);
  });

  it('深淵の瞳で出現間隔が半分・残滓+1', () => {
    const s = createInitialState(NOW);
    s.residueUpgrades['abysseye'] = 1;
    scheduleNextNightmare(s, NOW, () => 0);
    expect(s.event.nextNightmareAt).toBe(NOW + 90_000);
    expect(residueReward(s)).toBe(2);
    s.unlockedLayers = 4;
    expect(residueReward(s)).toBe(3);
  });
});
