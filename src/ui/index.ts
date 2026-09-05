import Decimal from 'break_eternity.js';
import type { GameState } from '../state';
import { LAYERS, layerByIndex } from '../data/layers';
import { dwellersOfLayer, DWELLERS } from '../data/dwellers';
import { MEMORY_UPGRADES, RESIDUE_UPGRADES, upgradeById, type UpgradeDef } from '../data/upgrades';
import { ACHIEVEMENTS } from '../data/achievements';
import { totalProdPerSec, tapGain, gainFragments } from '../logic/production';
import {
  dwellerPrice,
  buyDweller,
  canBuyDweller,
  nextLayerToUnlock,
  canUnlockLayer,
  unlockLayer,
  canBuyUpgrade,
  buyUpgrade,
} from '../logic/purchase';
import { memoriesOnAwaken, awaken } from '../logic/prestige';
import { clickNightmare, isRemActive, msUntilNextRem } from '../logic/events';
import { exportSave, importSave, saveToStorage, hasStorage } from '../save';
import { formatDecimal, formatDuration } from './format';

type Tab = 'dream' | 'awaken' | 'journal' | 'settings';

export interface UI {
  update(now: number): void;
  showOfflineModal(gained: Decimal, elapsedMs: number): void;
  toast(text: string): void;
}

export function initUI(state: GameState, onImportState: (s: GameState) => void): UI {
  const app = document.getElementById('app')!;
  let activeTab: Tab = 'dream';
  let structureSig = '';

  const fmt = (d: Decimal) => formatDecimal(d, state.settings.notation);

  app.innerHTML = `
    <header class="topbar">
      <div class="title-block">
        <h1>眠りの跡</h1>
        <span class="subtitle">— 夢潜行 —</span>
      </div>
      <div class="stat-block">
        <div class="fragments"><span data-el="fragments">0</span> <small>夢片</small></div>
        <div class="persec"><span data-el="persec">0</span>/秒</div>
        <div class="depth" data-el="depth"></div>
        <div class="buffs" data-el="buffs"></div>
      </div>
    </header>
    <nav class="tabs">
      <button data-action="tab" data-tab="dream" class="active">夢</button>
      <button data-action="tab" data-tab="awaken">目覚め</button>
      <button data-action="tab" data-tab="journal">夢日記</button>
      <button data-action="tab" data-tab="settings">設定</button>
    </nav>
    <main>
      <section id="tab-dream" class="panel active"></section>
      <section id="tab-awaken" class="panel"></section>
      <section id="tab-journal" class="panel"></section>
      <section id="tab-settings" class="panel"></section>
    </main>
    <div id="nightmare" class="nightmare hidden">
      <button data-action="nightmare-click">
        <span class="nm-title">悪夢が現れた！</span>
        <span class="nm-desc">連打して祓え！ 残り <span data-el="nm-clicks">20</span> 回</span>
        <span class="nm-timer" data-el="nm-timer"></span>
      </button>
    </div>
    <div id="modal" class="modal hidden">
      <div class="modal-body">
        <div data-el="modal-content"></div>
        <button data-action="close-modal">閉じる</button>
      </div>
    </div>
    <div id="toasts"></div>
  `;

  const el = (name: string) => app.querySelector<HTMLElement>(`[data-el="${name}"]`)!;
  const panel = (tab: Tab) => app.querySelector<HTMLElement>(`#tab-${tab}`)!;

  // ---- 各タブの構造描画（購入・解放などの状態変化時のみ再構築） ----

  function renderDream(): string {
    let html = `
      <div class="tap-area">
        <button class="tap-button" data-action="tap">🌙<span>夢をつかむ</span></button>
        <div class="tap-gain">タップ +<span data-el="tapgain">1</span></div>
      </div>`;
    for (const layer of LAYERS) {
      if (layer.index > state.unlockedLayers) break;
      html += `
        <div class="layer layer-${layer.index}">
          <div class="layer-head">
            <h2>第${layer.index}層 ${layer.name}</h2>
            <span class="accel">時間加速 ×${layer.timeAccel}</span>
          </div>
          <p class="flavor">${layer.flavor}</p>
          <div class="dwellers">`;
      for (const def of dwellersOfLayer(layer.index)) {
        html += `
            <button class="dweller" data-action="buy" data-id="${def.id}">
              <span class="d-name">${def.name}</span>
              <span class="d-count" data-count-for="${def.id}">0</span>
              <span class="d-prod" data-prod-for="${def.id}"></span>
              <span class="d-price" data-price-for="${def.id}"></span>
            </button>`;
      }
      html += `</div></div>`;
    }
    const next = nextLayerToUnlock(state);
    if (next !== null) {
      const def = layerByIndex(next);
      html += `
        <button class="unlock" data-action="unlock">
          さらに深く潜る — 第${next}層 ${def.name}
          <span class="u-cost">${fmt(def.unlockCost)} 夢片</span>
        </button>`;
    } else {
      html += `<p class="bottom-note">……夢の底は、まだこの先にあるらしい。（続きは今後のアップデートで）</p>`;
    }
    return html;
  }

  function upgradeRow(def: UpgradeDef, lv: number, currencyLabel: string): string {
    const maxed = lv >= def.maxLv;
    return `
      <button class="upgrade" data-action="upgrade" data-id="${def.id}" ${maxed ? 'disabled' : ''}>
        <span class="u-name">${def.name} <em>Lv.${lv}${def.maxLv <= 100 ? `/${def.maxLv}` : ''}</em></span>
        <span class="u-desc">${maxed ? '最大レベル' : def.desc(lv)}</span>
        <span class="u-price">${maxed ? '—' : `${fmt(def.cost(lv))} ${currencyLabel}`}</span>
      </button>`;
  }

  function renderAwaken(): string {
    let html = `
      <div class="awaken-status">
        <div>記憶: <strong data-el="memories">0</strong></div>
        <div>悪夢の残滓: <strong data-el="residue">0</strong></div>
      </div>
      <div class="awaken-box">
        <p>目覚めると夢片・住人・階層はすべて消えるが、「記憶」を持ち帰れる。</p>
        <p>いま目覚めると: <strong data-el="pending-memories">0</strong> 記憶</p>
        <button class="awaken-button" data-action="awaken">目を覚ます</button>
        <p class="hint">記憶は今回の眠りで集めた夢片の累計で決まる（√(累計/100万)）</p>
      </div>
      <h2>記憶ショップ</h2>
      <div class="shop">`;
    for (const def of MEMORY_UPGRADES) {
      html += upgradeRow(def, state.memoryUpgrades[def.id] ?? 0, '記憶');
    }
    html += `</div><h2>残滓ショップ</h2><div class="shop">`;
    for (const def of RESIDUE_UPGRADES) {
      html += upgradeRow(def, state.residueUpgrades[def.id] ?? 0, '残滓');
    }
    html += `</div>`;
    return html;
  }

  function renderJournal(): string {
    const bonus = state.achievements.length;
    let html = `
      <p class="journal-head">達成 ${state.achievements.length}/${ACHIEVEMENTS.length} — 実績ボーナス: 全生産 +${bonus}%</p>
      <div class="achievements">`;
    for (const def of ACHIEVEMENTS) {
      const done = state.achievements.includes(def.id);
      html += `
        <div class="achievement ${done ? 'done' : ''}">
          <span class="a-name">${done ? def.name : '？？？'}</span>
          <span class="a-desc">${def.desc}</span>
        </div>`;
    }
    html += `</div>
      <h2>統計</h2>
      <ul class="stats-list">
        <li>目覚めた回数: ${state.stats.totalAwakenings}</li>
        <li>祓った悪夢: ${state.stats.totalNightmaresBanished}</li>
        <li>タップ回数: ${state.stats.totalTaps}</li>
        <li>迎えた住人: ${state.stats.totalDwellersBought}</li>
        <li>夢片の累計: ${fmt(state.stats.allTimeFragments)}</li>
      </ul>`;
    return html;
  }

  function renderSettings(): string {
    return `
      ${hasStorage ? '' : '<p class="warn">⚠ このブラウザでは保存が使えません。進行はタブを閉じると失われます。</p>'}
      <h2>表記</h2>
      <div class="setting-row">
        <button data-action="notation" data-value="jp" class="${state.settings.notation === 'jp' ? 'active' : ''}">日本語単位（兆・京…）</button>
        <button data-action="notation" data-value="sci" class="${state.settings.notation === 'sci' ? 'active' : ''}">科学表記（1.23e45）</button>
      </div>
      <h2>セーブデータ</h2>
      <div class="setting-row">
        <button data-action="export">エクスポート</button>
        <button data-action="import">インポート</button>
        <button data-action="hard-reset" class="danger">完全リセット</button>
      </div>
      <p class="hint">30秒ごとに自動保存されます。</p>
      <p class="version">眠りの跡 v0.1</p>`;
  }

  function rebuildIfNeeded(): void {
    const sig = JSON.stringify([
      activeTab,
      state.unlockedLayers,
      DWELLERS.map((d) => state.dwellers[d.id] ?? 0),
      state.memoryUpgrades,
      state.residueUpgrades,
      state.achievements.length,
      state.stats.totalAwakenings,
      state.settings.notation,
      hasStorage,
    ]);
    if (sig === structureSig) return;
    structureSig = sig;
    panel('dream').innerHTML = renderDream();
    panel('awaken').innerHTML = renderAwaken();
    panel('journal').innerHTML = renderJournal();
    panel('settings').innerHTML = renderSettings();
    document.body.className = `depth-${state.unlockedLayers}`;
  }

  // ---- 毎ティックの数値更新 ----

  function update(now: number): void {
    rebuildIfNeeded();
    const prod = totalProdPerSec(state, now);
    el('fragments').textContent = fmt(state.fragments);
    el('persec').textContent = fmt(prod);
    const layer = layerByIndex(state.unlockedLayers);
    el('depth').textContent = `現在深度: 第${layer.index}層 ${layer.name}`;

    const buffs: string[] = [];
    if (isRemActive(state, now)) {
      buffs.push('<span class="buff rem">レム睡眠 ×2</span>');
    } else {
      buffs.push(`<span class="buff rem-wait">次のレムまで ${formatDuration(msUntilNextRem(state, now))}</span>`);
    }
    if (now < state.event.debuffUntil) {
      buffs.push(`<span class="buff debuff">悪夢の余韻 ×0.5 (${formatDuration(state.event.debuffUntil - now)})</span>`);
    }
    el('buffs').innerHTML = buffs.join('');

    if (activeTab === 'dream') {
      const tapEl = app.querySelector<HTMLElement>('[data-el="tapgain"]');
      if (tapEl) tapEl.textContent = fmt(tapGain(state, now));
      for (const def of DWELLERS) {
        if (def.layerIndex > state.unlockedLayers) break;
        const count = state.dwellers[def.id] ?? 0;
        const price = dwellerPrice(def, count);
        const countEl = app.querySelector<HTMLElement>(`[data-count-for="${def.id}"]`);
        if (!countEl) continue;
        countEl.textContent = String(count);
        app.querySelector<HTMLElement>(`[data-price-for="${def.id}"]`)!.textContent = `${fmt(price)} 夢片`;
        app.querySelector<HTMLElement>(`[data-prod-for="${def.id}"]`)!.textContent =
          count > 0 ? `${fmt(def.baseProd.mul(count))}/秒` : `1体 ${fmt(def.baseProd)}/秒`;
        const btn = countEl.closest('button')!;
        btn.classList.toggle('affordable', canBuyDweller(state, def.id));
      }
      const unlockBtn = app.querySelector<HTMLButtonElement>('[data-action="unlock"]');
      if (unlockBtn) unlockBtn.classList.toggle('affordable', canUnlockLayer(state));
    }

    if (activeTab === 'awaken') {
      el('memories').textContent = fmt(state.memories);
      el('residue').textContent = String(state.nightmareResidue);
      el('pending-memories').textContent = fmt(memoriesOnAwaken(state.totalFragmentsThisSleep));
      for (const def of [...MEMORY_UPGRADES, ...RESIDUE_UPGRADES]) {
        const btn = app.querySelector<HTMLButtonElement>(`[data-action="upgrade"][data-id="${def.id}"]`);
        if (btn && !btn.disabled) btn.classList.toggle('affordable', canBuyUpgrade(state, def));
      }
    }

    const nm = state.event.nightmare;
    const nmEl = document.getElementById('nightmare')!;
    nmEl.classList.toggle('hidden', nm === null);
    if (nm) {
      el('nm-clicks').textContent = String(nm.clicksLeft);
      el('nm-timer').textContent = `${Math.max(0, Math.ceil((nm.expiresAt - now) / 1000))}秒`;
    }
  }

  // ---- モーダル・トースト ----

  function showModal(html: string): void {
    el('modal-content').innerHTML = html;
    document.getElementById('modal')!.classList.remove('hidden');
  }

  function showOfflineModal(gained: Decimal, elapsedMs: number): void {
    showModal(`
      <h2>おかえりなさい</h2>
      <p>あなたが離れていた ${formatDuration(elapsedMs)} のあいだも、夢は続いていた。</p>
      <p class="offline-gain">+${fmt(gained)} 夢片</p>`);
  }

  function toast(text: string): void {
    const container = document.getElementById('toasts')!;
    while (container.children.length >= 4) container.firstElementChild!.remove();
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = text;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  }

  // ---- 入力 ----

  app.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const now = Date.now();
    switch (target.dataset['action']) {
      case 'tab': {
        activeTab = target.dataset['tab'] as Tab;
        app.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b === target));
        (['dream', 'awaken', 'journal', 'settings'] as Tab[]).forEach((t) =>
          panel(t).classList.toggle('active', t === activeTab),
        );
        structureSig = ''; // タブ切替時に最新内容へ再構築
        break;
      }
      case 'tap': {
        gainFragments(state, tapGain(state, now));
        state.stats.totalTaps += 1;
        target.classList.remove('tapped');
        void target.offsetWidth; // アニメーション再トリガー
        target.classList.add('tapped');
        break;
      }
      case 'buy':
        buyDweller(state, target.dataset['id']!);
        break;
      case 'unlock':
        if (unlockLayer(state)) toast(`第${state.unlockedLayers}層に到達した`);
        break;
      case 'upgrade':
        buyUpgrade(state, upgradeById(target.dataset['id']!));
        break;
      case 'awaken': {
        const pending = memoriesOnAwaken(state.totalFragmentsThisSleep);
        const msg = pending.eq(0)
          ? 'まだ記憶は得られない（累計100万夢片が必要）。それでも目覚めますか？'
          : `${fmt(pending)} 記憶を持ち帰って目覚めますか？\n夢片・住人・階層はリセットされます。`;
        if (confirm(msg)) {
          const gained = awaken(state, now);
          toast(gained.gt(0) ? `${fmt(gained)} の記憶を持ち帰った` : '何も持ち帰れなかった…');
        }
        break;
      }
      case 'nightmare-click':
        if (clickNightmare(state, now)) toast('悪夢を祓った！');
        break;
      case 'notation':
        state.settings.notation = target.dataset['value'] as 'sci' | 'jp';
        structureSig = '';
        break;
      case 'export': {
        const text = exportSave(state);
        showModal(`
          <h2>エクスポート</h2>
          <p>下の文字列をコピーして保管してください。</p>
          <textarea readonly rows="6">${text}</textarea>`);
        break;
      }
      case 'import': {
        const text = prompt('エクスポートした文字列を貼り付けてください');
        if (text) {
          try {
            onImportState(importSave(text, now));
            toast('インポートしました');
          } catch {
            alert('セーブデータを読み込めませんでした。');
          }
        }
        break;
      }
      case 'hard-reset':
        if (
          confirm('本当にすべての進行を消しますか？記憶・実績も失われます。') &&
          confirm('この操作は取り消せません。よろしいですか？')
        ) {
          localStorage.removeItem('nemuriNoAto.save');
          localStorage.removeItem('nemuriNoAto.save.bak');
          location.reload();
        }
        break;
      case 'close-modal':
        document.getElementById('modal')!.classList.add('hidden');
        break;
    }
    saveToStorage(state, now);
  });

  return { update, showOfflineModal, toast };
}
