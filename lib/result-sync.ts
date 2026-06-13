import { fetchWorldCupFixturesByIds, scoresFromApiFootball, statusFromApiFootball } from "@/lib/api-football";
import { evaluateCompletedGroupWinnerBonuses, recalculateMatch, revalidateResultViews } from "@/lib/results";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Match } from "@/lib/types";

type SyncableMatch = Match & {
  api_football_fixture_id: number | null;
};

export type ResultSyncReport = {
  ok: boolean;
  checked: number;
  updated: number;
  recalculated: number;
  skipped: number;
  message: string;
};

export async function syncResultsFromApiFootball(): Promise<ResultSyncReport> {
  const supabase = createServerSupabaseClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*,home_team:home_team_id(name,short_name),away_team:away_team_id(name,short_name)")
    .not("api_football_fixture_id", "is", null)
    .gte("kickoff_at", windowStart)
    .lte("kickoff_at", windowEnd)
    .order("kickoff_at", { ascending: true });

  if (error) throw error;

  const syncableMatches = (matches ?? []) as SyncableMatch[];
  const fixtureIds = syncableMatches
    .map((match) => match.api_football_fixture_id)
    .filter((fixtureId): fixtureId is number => typeof fixtureId === "number");

  if (!fixtureIds.length) {
    return {
      ok: true,
      checked: 0,
      updated: 0,
      recalculated: 0,
      skipped: 0,
      message: "Keine API-FOOTBALL Fixture-IDs im aktuellen Sync-Zeitfenster hinterlegt."
    };
  }

  const { fixtures, skippedReason } = await fetchWorldCupFixturesByIds(fixtureIds);
  if (skippedReason) {
    return {
      ok: false,
      checked: fixtureIds.length,
      updated: 0,
      recalculated: 0,
      skipped: fixtureIds.length,
      message: skippedReason
    };
  }

  let updated = 0;
  let recalculated = 0;
  let skipped = 0;

  for (const match of syncableMatches) {
    const fixtureId = match.api_football_fixture_id;
    const fixture = fixtureId ? fixtures.get(fixtureId) : null;
    if (!fixture) {
      skipped += 1;
      continue;
    }

    const status = statusFromApiFootball(fixture.fixture?.status?.short);
    const { homeScore, awayScore } = scoresFromApiFootball(fixture);
    const patch = {
      status,
      home_score: status === "finished" || status === "live" ? homeScore : match.home_score,
      away_score: status === "finished" || status === "live" ? awayScore : match.away_score,
      last_synced_at: new Date().toISOString(),
      sync_source: "api-football"
    };

    const hasChanged =
      patch.status !== match.status ||
      patch.home_score !== match.home_score ||
      patch.away_score !== match.away_score;

    if (!hasChanged) {
      skipped += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update(patch)
      .eq("id", match.id);
    if (updateError) throw updateError;

    updated += 1;
    if (status === "finished" && homeScore !== null && awayScore !== null) {
      await recalculateMatch(match.id);
      recalculated += 1;
      revalidateResultViews(match.id);
    }
  }

  if (updated > 0) {
    await evaluateCompletedGroupWinnerBonuses();
    revalidateResultViews();
  }

  return {
    ok: true,
    checked: syncableMatches.length,
    updated,
    recalculated,
    skipped,
    message: updated > 0 ? "Ergebnisse synchronisiert." : "Keine Aenderungen gefunden."
  };
}
