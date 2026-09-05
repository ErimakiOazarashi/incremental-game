/**
 * 固定間隔のゲームループ。setInterval ベースで、非アクティブタブの
 * スロットリングにも経過時間ベースで追従する。
 */
export interface LoopHandle {
  stop(): void;
}

const TICK_MS = 100;
/** これを超える経過はオフライン進行扱いにする（秒） */
export const OFFLINE_THRESHOLD_SEC = 120;

export function startLoop(
  onTick: (dtSec: number, now: number) => void,
  onLongGap: (now: number) => void,
): LoopHandle {
  let last = Date.now();
  const id = setInterval(() => {
    const now = Date.now();
    const dtSec = (now - last) / 1000;
    last = now;
    if (dtSec <= 0) return; // 時計巻き戻しは無視
    if (dtSec > OFFLINE_THRESHOLD_SEC) {
      onLongGap(now);
    } else {
      onTick(dtSec, now);
    }
  }, TICK_MS);
  return { stop: () => clearInterval(id) };
}
