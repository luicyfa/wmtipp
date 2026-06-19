import { buildGroupTables } from "@/lib/groups";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Match, Team } from "@/lib/types";

export const knockoutRounds = [
  "Sechzehntelfinale",
  "Achtelfinale",
  "Viertelfinale",
  "Halbfinale",
  "Spiel um Platz 3",
  "Finale"
] as const;

export function isKnockoutMatch(match: Pick<Match, "round">) {
  return match.round !== "Gruppenphase";
}

export function isMatchPredictionOpen(
  match: Pick<Match, "round" | "prediction_open" | "home_team_id" | "away_team_id">
) {
  if (match.prediction_open === false) return false;
  if (!isKnockoutMatch(match)) return true;
  return Boolean(match.home_team_id && match.away_team_id);
}

function sourceMatchNumber(label: string | null, prefix: "W" | "RU") {
  const match = label?.match(new RegExp(`^${prefix}(\\d+)$`));
  return match ? Number(match[1]) : null;
}

function teamIdForGroupSlot(
  label: string | null,
  groupTables: ReturnType<typeof buildGroupTables>,
  teams: Team[]
) {
  const slot = label?.match(/^([12])([A-L])$/);
  if (!slot) return null;

  const position = Number(slot[1]) - 1;
  const group = groupTables.find((item) => item.groupCode === slot[2]);
  if (!group || group.finishedMatches !== group.totalMatches) return null;
  const teamName = group.standings[position]?.teamName;
  return teams.find((team) => team.name === teamName)?.id ?? null;
}

function propagatedTeamId(label: string | null, matches: Match[]) {
  const winnerSource = sourceMatchNumber(label, "W");
  if (winnerSource) {
    return matches.find((match) => match.match_number === winnerSource)?.winner_team_id ?? null;
  }

  const runnerUpSource = sourceMatchNumber(label, "RU");
  if (runnerUpSource) {
    const source = matches.find((match) => match.match_number === runnerUpSource);
    if (!source?.winner_team_id) return null;
    return source.home_team_id === source.winner_team_id ? source.away_team_id : source.home_team_id;
  }

  return null;
}

export async function updateKnockoutBracket() {
  const supabase = createServerSupabaseClient();
  const [{ data: matchesData, error: matchesError }, { data: teamsData, error: teamsError }] = await Promise.all([
    supabase
      .from("matches")
      .select("*,home_team:home_team_id(name,short_name),away_team:away_team_id(name,short_name)")
      .order("match_number", { ascending: true }),
    supabase.from("teams").select("*").eq("placeholder", false)
  ]);
  if (matchesError) throw matchesError;
  if (teamsError) throw teamsError;

  const matches = (matchesData ?? []) as Match[];
  const teams = (teamsData ?? []) as Team[];
  const groups = buildGroupTables(matches);
  let updated = 0;
  let opened = 0;

  for (const match of matches.filter(isKnockoutMatch)) {
    const homeTeamId =
      match.home_team_id ??
      teamIdForGroupSlot(match.home_team_label, groups, teams) ??
      propagatedTeamId(match.home_team_label, matches);
    const awayTeamId =
      match.away_team_id ??
      teamIdForGroupSlot(match.away_team_label, groups, teams) ??
      propagatedTeamId(match.away_team_label, matches);
    const predictionOpen = Boolean(homeTeamId && awayTeamId && match.status === "scheduled");

    if (
      homeTeamId !== match.home_team_id ||
      awayTeamId !== match.away_team_id ||
      predictionOpen !== Boolean(match.prediction_open)
    ) {
      const { error } = await supabase
        .from("matches")
        .update({
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          prediction_open: predictionOpen,
          updated_at: new Date().toISOString()
        })
        .eq("id", match.id);
      if (error) throw error;
      updated += 1;
      if (predictionOpen && !match.prediction_open) opened += 1;
      match.home_team_id = homeTeamId;
      match.away_team_id = awayTeamId;
      match.prediction_open = predictionOpen;
    }
  }

  return { updated, opened };
}
