import Decimal from 'break_eternity.js';
import type { GameState } from '../state';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  achieved: (state: GameState) => boolean;
}

function fragAch(exp: number, name: string): AchievementDef {
  return {
    id: `frag_e${exp}`,
    name,
    desc: `夢片を累計 1e${exp} 集める`,
    achieved: (s) => s.stats.allTimeFragments.gte(Decimal.pow(10, exp)),
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  fragAch(3, 'まどろみの入り口'),
  fragAch(6, '浅瀬のあぶく'),
  fragAch(9, '夢見の常連'),
  fragAch(12, '眠りの職人'),
  fragAch(15, '夜の帳の向こう'),
  fragAch(18, '夢幻の蒐集家'),
  fragAch(21, '深層の探検家'),
  fragAch(24, '眠りの大公'),
  fragAch(30, '夢の造物主'),
  fragAch(40, '底のない底'),
  fragAch(50, '無限のまどろみ'),
  fragAch(100, '夢そのもの'),
  {
    id: 'awaken_1',
    name: 'はじめての目覚め',
    desc: '一度目覚める',
    achieved: (s) => s.stats.totalAwakenings >= 1,
  },
  {
    id: 'awaken_5',
    name: '二度寝の達人',
    desc: '5回目覚める',
    achieved: (s) => s.stats.totalAwakenings >= 5,
  },
  {
    id: 'awaken_25',
    name: '眠りの巡礼者',
    desc: '25回目覚める',
    achieved: (s) => s.stats.totalAwakenings >= 25,
  },
  {
    id: 'awaken_100',
    name: '輪廻の寝坊助',
    desc: '100回目覚める',
    achieved: (s) => s.stats.totalAwakenings >= 100,
  },
  {
    id: 'layer_2',
    name: '図書館の閲覧証',
    desc: '記憶の図書館に到達する',
    achieved: (s) => s.unlockedLayers >= 2,
  },
  {
    id: 'layer_3',
    name: '逆さの市民権',
    desc: '逆さの都市に到達する',
    achieved: (s) => s.unlockedLayers >= 3,
  },
  {
    id: 'layer_4',
    name: '深海の潜水証',
    desc: '静寂の深海に到達する',
    achieved: (s) => s.unlockedLayers >= 4,
  },
  {
    id: 'layer_5',
    name: '星々の墓参り',
    desc: '星の墓場に到達する',
    achieved: (s) => s.unlockedLayers >= 5,
  },
  {
    id: 'nightmare_1',
    name: '悪夢ばらい',
    desc: '悪夢を1回祓う',
    achieved: (s) => s.stats.totalNightmaresBanished >= 1,
  },
  {
    id: 'nightmare_10',
    name: '夜の用心棒',
    desc: '悪夢を10回祓う',
    achieved: (s) => s.stats.totalNightmaresBanished >= 10,
  },
  {
    id: 'nightmare_50',
    name: '悪夢の天敵',
    desc: '悪夢を50回祓う',
    achieved: (s) => s.stats.totalNightmaresBanished >= 50,
  },
  {
    id: 'tap_100',
    name: 'まばたきの数だけ',
    desc: '100回タップする',
    achieved: (s) => s.stats.totalTaps >= 100,
  },
  {
    id: 'tap_1000',
    name: '夢を掴む手',
    desc: '1,000回タップする',
    achieved: (s) => s.stats.totalTaps >= 1000,
  },
  {
    id: 'tap_10000',
    name: '不眠の指先',
    desc: '10,000回タップする',
    achieved: (s) => s.stats.totalTaps >= 10000,
  },
  {
    id: 'dweller_10',
    name: '小さな夢の住人たち',
    desc: '住人を累計10体迎える',
    achieved: (s) => s.stats.totalDwellersBought >= 10,
  },
  {
    id: 'dweller_100',
    name: '夢の町内会',
    desc: '住人を累計100体迎える',
    achieved: (s) => s.stats.totalDwellersBought >= 100,
  },
  {
    id: 'dweller_1000',
    name: '夢の大都市',
    desc: '住人を累計1,000体迎える',
    achieved: (s) => s.stats.totalDwellersBought >= 1000,
  },
  {
    id: 'memory_10',
    name: '思い出のかけら',
    desc: '記憶を累計10獲得する',
    achieved: (s) => s.stats.allTimeMemories.gte(10),
  },
  {
    id: 'memory_100',
    name: 'アルバムの一冊目',
    desc: '記憶を累計100獲得する',
    achieved: (s) => s.stats.allTimeMemories.gte(100),
  },
  {
    id: 'memory_1000',
    name: '忘れない人',
    desc: '記憶を累計1,000獲得する',
    achieved: (s) => s.stats.allTimeMemories.gte(1000),
  },
];
