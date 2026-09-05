import Decimal from 'break_eternity.js';

const JP_UNITS: Array<[number, string]> = [
  [68, '無量大数'],
  [64, '不可思議'],
  [60, '那由他'],
  [56, '阿僧祇'],
  [52, '恒河沙'],
  [48, '極'],
  [44, '載'],
  [40, '正'],
  [36, '澗'],
  [32, '溝'],
  [28, '穣'],
  [24, '𥝱'],
  [20, '垓'],
  [16, '京'],
  [12, '兆'],
  [8, '億'],
  [4, '万'],
];

function sci(d: Decimal): string {
  const exp = d.log10().floor();
  const mantissa = d.div(Decimal.pow(10, exp));
  return `${mantissa.toNumber().toFixed(2)}e${exp.toNumber()}`;
}

/** 大数の表示。notation='jp' は日本語単位（1e72 以上は科学表記へフォールバック） */
export function formatDecimal(d: Decimal, notation: 'sci' | 'jp' = 'jp'): string {
  if (d.lt(0)) return `-${formatDecimal(d.neg(), notation)}`;
  if (d.eq(0)) return '0';
  if (d.lt(1)) return d.toNumber().toFixed(2);
  if (d.lt(1e4)) {
    const n = d.toNumber();
    return n === Math.floor(n) ? String(n) : n.toFixed(1);
  }
  if (notation === 'jp' && d.lt(1e72)) {
    for (const [exp, unit] of JP_UNITS) {
      if (d.gte(Decimal.pow(10, exp))) {
        const value = d.div(Decimal.pow(10, exp)).toNumber();
        const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
        return `${value.toFixed(digits)}${unit}`;
      }
    }
  }
  return sci(d);
}

/** 秒数を「3時間12分」等に整形 */
export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分${sec % 60}秒`;
  const hour = Math.floor(min / 60);
  return `${hour}時間${min % 60}分`;
}
