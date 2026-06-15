import type { RankingRow } from "./types.ts";

export function rankForRow(rankings: RankingRow[], index: number) {
  const row = rankings[index];
  if (!row) return null;

  const firstSameRankIndex = rankings.findIndex(
    (item) => item.total_points === row.total_points && item.exact_scores === row.exact_scores
  );

  return firstSameRankIndex === -1 ? index + 1 : firstSameRankIndex + 1;
}

export function rankForPlayer(rankings: RankingRow[], playerId: string) {
  const index = rankings.findIndex((row) => row.player_id === playerId);
  return index === -1 ? null : rankForRow(rankings, index);
}
