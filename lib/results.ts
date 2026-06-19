import { revalidatePath, revalidateTag } from "next/cache";
import { getMatch, getMatches, getScoreRules } from "@/lib/data";
import { buildGroupTables } from "@/lib/groups";
import { calculatePredictionPoints } from "@/lib/scoring";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function recalculateMatch(matchId: string) {
  const supabase = createServerSupabaseClient();
  const match = await getMatch(matchId);
  const rules = await getScoreRules();
  const { data: predictions, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("match_id", matchId);
  if (error) throw error;

  for (const prediction of predictions ?? []) {
    const result = calculatePredictionPoints(prediction, match, rules);
    await supabase
      .from("predictions")
      .update({ ...result, locked_at: match.kickoff_at, updated_at: new Date().toISOString() })
      .eq("id", prediction.id);
  }
}

export async function evaluateCompletedGroupWinnerBonuses() {
  const matches = await getMatches();
  const completedGroups = buildGroupTables(matches).filter(
    (group) => group.totalMatches > 0 && group.finishedMatches === group.totalMatches && group.standings[0]
  );
  if (!completedGroups.length) return;

  const supabase = createServerSupabaseClient();
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id,name,group_code")
    .eq("placeholder", false);
  if (teamsError) throw teamsError;

  const teamByGroupAndName = new Map(
    (teams ?? []).map((team) => [`${team.group_code}:${team.name}`, team.id as string])
  );

  for (const group of completedGroups) {
    const winnerName = group.standings[0]?.teamName;
    const winnerTeamId = teamByGroupAndName.get(`${group.groupCode}:${winnerName}`);
    if (!winnerTeamId) continue;

    const type = `group_winner_${group.groupCode}`;
    const firstKickoff = group.matches
      .map((match) => match.kickoff_at)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    const { data: bonusPredictions, error } = await supabase
      .from("bonus_predictions")
      .select("id,team_id")
      .eq("type", type);
    if (error) throw error;

    for (const prediction of bonusPredictions ?? []) {
      await supabase
        .from("bonus_predictions")
        .update({
          points: prediction.team_id === winnerTeamId ? 2 : 0,
          locked_at: firstKickoff ?? null
        })
        .eq("id", prediction.id);
    }
  }
}

export function revalidateResultViews(matchId?: string) {
  revalidateTag("matches");
  revalidateTag("rankings");
  revalidatePath("/admin/spiele");
  revalidatePath("/rangliste");
  revalidatePath("/dashboard");
  revalidatePath("/gruppen");
  revalidatePath("/finalrunde");
  if (matchId) revalidatePath(`/spiele/${matchId}`);
}
