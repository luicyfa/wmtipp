import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RankingRow } from "@/lib/types";
export { rankForPlayer, rankForRow } from "@/lib/ranking-places";

const getCachedRankings = unstable_cache(async (): Promise<RankingRow[]> => {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_rankings");
  if (error) throw error;

  const rows = (data ?? []) as RankingRow[];
  return rows.sort((a: RankingRow, b: RankingRow) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores;
    return a.name.localeCompare(b.name, "de");
  });
}, ["rankings"], { tags: ["rankings"], revalidate: 60 });

export async function getRankings(): Promise<RankingRow[]> {
  return getCachedRankings();
}
