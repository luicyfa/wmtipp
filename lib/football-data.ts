export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "SUSPENDED" | "CANCELLED";
  matchday?: number | null;
  stage?: string | null;
  group?: string | null;
  homeTeam?: {
    id?: number | null;
    name?: string | null;
    shortName?: string | null;
    tla?: string | null;
  };
  awayTeam?: {
    id?: number | null;
    name?: string | null;
    shortName?: string | null;
    tla?: string | null;
  };
  score?: {
    winner?: string | null;
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

type FootballDataMatchesResponse = {
  count?: number;
  matches?: FootballDataMatch[];
  message?: string;
};

const DEFAULT_FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const DEFAULT_FOOTBALL_DATA_COMPETITION = "WC";
const DEFAULT_FOOTBALL_DATA_SEASON = "2026";

function getFootballDataConfig() {
  return {
    token: process.env.FOOTBALL_DATA_TOKEN,
    baseUrl: process.env.FOOTBALL_DATA_BASE_URL ?? DEFAULT_FOOTBALL_DATA_BASE_URL,
    competition: process.env.FOOTBALL_DATA_COMPETITION ?? DEFAULT_FOOTBALL_DATA_COMPETITION,
    season: process.env.FOOTBALL_DATA_SEASON ?? DEFAULT_FOOTBALL_DATA_SEASON
  };
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function statusFromFootballData(status: FootballDataMatch["status"]) {
  if (status === "FINISHED") return "finished";
  if (status === "IN_PLAY" || status === "PAUSED") return "live";
  return "scheduled";
}

export function scoresFromFootballData(match: FootballDataMatch) {
  return {
    homeScore: typeof match.score?.fullTime?.home === "number" ? match.score.fullTime.home : null,
    awayScore: typeof match.score?.fullTime?.away === "number" ? match.score.fullTime.away : null
  };
}

export async function fetchWorldCupMatchesFromFootballData(from: Date, to: Date) {
  const { token, baseUrl, competition, season } = getFootballDataConfig();
  if (!token) {
    return { matches: [] as FootballDataMatch[], skippedReason: "FOOTBALL_DATA_TOKEN fehlt.", competition, season };
  }

  const params = new URLSearchParams({
    season,
    dateFrom: isoDate(from),
    dateTo: isoDate(to)
  });
  const response = await fetch(`${baseUrl}/competitions/${competition}/matches?${params.toString()}`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store"
  });
  const payload = (await response.json()) as FootballDataMatchesResponse;

  if (!response.ok) {
    return {
      matches: [] as FootballDataMatch[],
      skippedReason: `football-data.org Fehler ${response.status}: ${payload.message ?? "Unbekannter Fehler"}`,
      competition,
      season
    };
  }

  return { matches: payload.matches ?? [], skippedReason: null, competition, season };
}
