import type { GameState } from '../state';
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';

/** 未達成の実績を判定し、新たに達成したものを返す */
export function checkAchievements(state: GameState): AchievementDef[] {
  const newly: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (state.achievements.includes(def.id)) continue;
    if (def.achieved(state)) {
      state.achievements.push(def.id);
      newly.push(def);
    }
  }
  return newly;
}
