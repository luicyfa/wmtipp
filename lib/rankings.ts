import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RankingRow } from "@/lib/types";

export async function getRankings(): Promise<RankingRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_rankings");
  if (error) throw error;

  const rows = (data ?? []) as RankingRow[];
  return rows.sort((a: RankingRow, b: RankingRow) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores;
    if (b.correct_tendencies !== a.correct_tendencies) {
      return b.correct_tendencies - a.correct_tendencies;
    }
    return a.name.localeCompare(b.name, "de");
  });
}

export function rankForPlayer(rankings: RankingRow[], playerId: string) {
  const index = rankings.findIndex((row) => row.player_id === playerId);
  return index === -1 ? null : index + 1;
}
