import { createInitialState, type GameState } from './state';
import { startLoop } from './loop';
import { tickProduction } from './logic/production';
import { tickNightmare } from './logic/events';
import { autoBuyDwellers } from './logic/purchase';
import { checkAchievements } from './logic/achievements';
import { applyOfflineProgress, loadFromStorage, saveToStorage, hasStorage } from './save';
import { initUI } from './ui/index';
import './style.css';

const now = Date.now();
const loaded = loadFromStorage(now);
const state: GameState = loaded ? loaded.state : createInitialState(now);

const ui = initUI(state, (imported) => {
  Object.assign(state, imported);
  saveToStorage(state, Date.now());
});

if (loaded?.usedBackup) {
  ui.toast('セーブが破損していたためバックアップから復元しました');
}
if (!hasStorage) {
  ui.toast('このブラウザでは保存が使えません');
}

// 起動時のオフライン進行
if (loaded && now - state.lastSavedAt > 60_000) {
  const result = applyOfflineProgress(state, now);
  if (result.gained.gt(0)) ui.showOfflineModal(result.gained, result.elapsedMs);
}

let slowAccumulator = 0;

startLoop(
  (dtSec, tickNow) => {
    tickProduction(state, dtSec, tickNow);
    tickNightmare(state, tickNow);

    // 自動購入と実績判定は1秒間隔で十分
    slowAccumulator += dtSec;
    if (slowAccumulator >= 1) {
      slowAccumulator = 0;
      autoBuyDwellers(state);
      for (const ach of checkAchievements(state)) {
        ui.toast(`実績達成: ${ach.name}`);
      }
    }
    ui.update(tickNow);
  },
  (gapNow) => {
    // タブ復帰などで大きく時間が飛んだ場合はオフライン進行扱い
    const result = applyOfflineProgress(state, gapNow);
    if (result.gained.gt(0)) ui.showOfflineModal(result.gained, result.elapsedMs);
    saveToStorage(state, gapNow);
  },
);

setInterval(() => saveToStorage(state, Date.now()), 30_000);
window.addEventListener('beforeunload', () => saveToStorage(state, Date.now()));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveToStorage(state, Date.now());
});
