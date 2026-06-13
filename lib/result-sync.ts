import {
  fetchWorldCupMatchesFromFootballData,
  scoresFromFootballData,
  statusFromFootballData,
  type FootballDataMatch
} from "@/lib/football-data";
import { evaluateCompletedGroupWinnerBonuses, recalculateMatch, revalidateResultViews } from "@/lib/results";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Match } from "@/lib/types";

type SyncableMatch = Match & {
  api_football_fixture_id: number | null;
};

export type ResultSyncReport = {
  ok: boolean;
  checked: number;
  apiFixtures: number;
  linked: number;
  updated: number;
  recalculated: number;
  skipped: number;
  message: string;
};

const TEAM_ALIASES: Record<string, string[]> = {
  "Ägypten": ["egypt"],
  "Algerien": ["algeria"],
  "Argentinien": ["argentina"],
  "Australien": ["australia"],
  "Belgien": ["belgium"],
  "Bosnien/Herzeg.": ["bosnia", "bosnia & herzegovina", "bosnia and herzegovina"],
  "Brasilien": ["brazil"],
  "Curaçao": ["curacao", "curaçao"],
  "Deutschland": ["germany"],
  "DR Kongo": ["congo dr", "dr congo", "congo drc"],
  "Ecuador": ["ecuador"],
  "Elfenbeinküste": ["cote d'ivoire", "côte d'ivoire", "ivory coast"],
  "England": ["england"],
  "Frankreich": ["france"],
  "Ghana": ["ghana"],
  "Haiti": ["haiti"],
  "IR Iran": ["iran", "ir iran"],
  "Irak": ["iraq"],
  "Japan": ["japan"],
  "Jordanien": ["jordan"],
  "Kanada": ["canada"],
  "Kap Verde": ["cape verde", "cabo verde"],
  "Katar": ["qatar"],
  "Kolumbien": ["colombia"],
  "Kroatien": ["croatia"],
  "Marokko": ["morocco"],
  "Mexiko": ["mexico"],
  "Neuseeland": ["new zealand"],
  "Niederlande": ["netherlands", "holland"],
  "Norwegen": ["norway"],
  "Österreich": ["austria"],
  "Panama": ["panama"],
  "Paraguay": ["paraguay"],
  "Portugal": ["portugal"],
  "Saudi-Arabien": ["saudi arabia"],
  "Schottland": ["scotland"],
  "Schweden": ["sweden"],
  "Schweiz": ["switzerland"],
  "Senegal": ["senegal"],
  "Spanien": ["spain"],
  "Südafrika": ["south africa"],
  "Südkorea": ["south korea", "korea republic", "korea republic of"],
  "Tschechien": ["czechia", "czech republic"],
  "Tunesien": ["tunisia"],
  "Türkei": ["turkey", "turkiye", "türkiye"],
  "Uruguay": ["uruguay"],
  "USA": ["usa", "united states", "united states of america"],
  "Usbekistan": ["uzbekistan"]
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(localName: string | null | undefined, apiName: string | null | undefined) {
  if (!localName || !apiName) return false;
  const normalizedApiName = normalize(apiName);
  const candidates = [localName, ...(TEAM_ALIASES[localName] ?? [])].map(normalize);
  return candidates.some((candidate) => candidate === normalizedApiName || normalizedApiName.includes(candidate));
}

function kickoffDiffMinutes(match: Match, externalMatch: FootballDataMatch) {
  return Math.abs(new Date(match.kickoff_at).getTime() - new Date(externalMatch.utcDate).getTime()) / 60000;
}

function findFixtureForMatch(match: SyncableMatch, externalMatches: FootballDataMatch[]) {
  if (match.api_football_fixture_id) {
    return externalMatches.find((externalMatch) => externalMatch.id === match.api_football_fixture_id) ?? null;
  }

  const homeLabel = match.home_team?.name ?? match.home_team_label;
  const awayLabel = match.away_team?.name ?? match.away_team_label;

  if (!homeLabel || !awayLabel || /\d/.test(homeLabel) || /\d/.test(awayLabel)) {
    return null;
  }

  return externalMatches.find((externalMatch) => {
    const homeName = externalMatch.homeTeam?.name;
    const awayName = externalMatch.awayTeam?.name;
    const teamsMatch = namesMatch(homeLabel, homeName) && namesMatch(awayLabel, awayName);
    return teamsMatch && kickoffDiffMinutes(match, externalMatch) <= 180;
  }) ?? null;
}

export async function syncResultsFromFootballData(): Promise<ResultSyncReport> {
  const supabase = createServerSupabaseClient();
  const now = new Date();
  const windowStartDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const windowEndDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowStart = windowStartDate.toISOString();
  const windowEnd = windowEndDate.toISOString();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*,home_team:home_team_id(name,short_name),away_team:away_team_id(name,short_name)")
    .gte("kickoff_at", windowStart)
    .lte("kickoff_at", windowEnd)
    .order("kickoff_at", { ascending: true });

  if (error) throw error;

  const syncableMatches = (matches ?? []) as SyncableMatch[];

  if (!syncableMatches.length) {
    return {
      ok: true,
      checked: 0,
      apiFixtures: 0,
      linked: 0,
      updated: 0,
      recalculated: 0,
      skipped: 0,
      message: "Keine Spiele im aktuellen Sync-Zeitfenster."
    };
  }

  const { matches: externalMatches, skippedReason, competition, season } = await fetchWorldCupMatchesFromFootballData(windowStartDate, windowEndDate);
  if (skippedReason) {
    return {
      ok: false,
      checked: syncableMatches.length,
      apiFixtures: 0,
      linked: 0,
      updated: 0,
      recalculated: 0,
      skipped: syncableMatches.length,
      message: skippedReason
    };
  }

  let updated = 0;
  let linked = 0;
  let recalculated = 0;
  let skipped = 0;

  for (const match of syncableMatches) {
    const externalMatch = findFixtureForMatch(match, externalMatches);
    if (!externalMatch) {
      skipped += 1;
      continue;
    }

    const fixtureId = externalMatch.id;
    const status = statusFromFootballData(externalMatch.status);
    const { homeScore, awayScore } = scoresFromFootballData(externalMatch);
    const patch = {
      api_football_fixture_id: fixtureId,
      status,
      home_score: status === "finished" || status === "live" ? homeScore : match.home_score,
      away_score: status === "finished" || status === "live" ? awayScore : match.away_score,
      last_synced_at: new Date().toISOString(),
      sync_source: `football-data:${competition}:${season}`
    };

    const hasChanged =
      patch.api_football_fixture_id !== match.api_football_fixture_id ||
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
    if (patch.api_football_fixture_id !== match.api_football_fixture_id) linked += 1;
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
    apiFixtures: externalMatches.length,
    linked,
    updated,
    recalculated,
    skipped,
    message: updated > 0 ? "Ergebnisse synchronisiert." : "Keine Aenderungen gefunden."
  };
}
