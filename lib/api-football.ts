export type ApiFootballFixture = {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      short?: string;
      long?: string;
      elapsed?: number | null;
    };
    venue?: {
      name?: string | null;
      city?: string | null;
    };
  };
  league?: {
    id?: number;
    name?: string;
    season?: number;
    round?: string;
  };
  teams?: {
    home?: {
      id?: number;
      name?: string;
      winner?: boolean | null;
    };
    away?: {
      id?: number;
      name?: string;
      winner?: boolean | null;
    };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
  score?: {
    fulltime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

type ApiFootballResponse = {
  response?: ApiFootballFixture[];
  errors?: unknown;
};

const DEFAULT_API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";
const DEFAULT_WORLD_CUP_LEAGUE_ID = 1;
const DEFAULT_WORLD_CUP_SEASON = 2026;
const FINISHED_STATUS = new Set(["FT", "AET", "PEN"]);
const LIVE_STATUS = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);

function getApiFootballConfig() {
  return {
    apiKey: process.env.API_FOOTBALL_KEY,
    baseUrl: process.env.API_FOOTBALL_BASE_URL ?? DEFAULT_API_FOOTBALL_BASE_URL,
    leagueId: Number(process.env.API_FOOTBALL_LEAGUE_ID ?? DEFAULT_WORLD_CUP_LEAGUE_ID),
    season: Number(process.env.API_FOOTBALL_SEASON ?? DEFAULT_WORLD_CUP_SEASON)
  };
}

async function fetchApiFootballFixtures(params: URLSearchParams) {
  const { apiKey, baseUrl } = getApiFootballConfig();
  if (!apiKey) {
    return { fixtures: [] as ApiFootballFixture[], skippedReason: "API_FOOTBALL_KEY fehlt." };
  }

  const response = await fetch(`${baseUrl}/fixtures?${params.toString()}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store"
  });

  const payload = (await response.json()) as ApiFootballResponse;
  if (!response.ok) {
    return {
      fixtures: [] as ApiFootballFixture[],
      skippedReason: `API-FOOTBALL Fehler ${response.status}: ${JSON.stringify(payload.errors ?? {})}`
    };
  }

  if (payload.errors && Object.keys(payload.errors).length > 0) {
    return {
      fixtures: [] as ApiFootballFixture[],
      skippedReason: `API-FOOTBALL Fehler: ${JSON.stringify(payload.errors)}`
    };
  }

  return { fixtures: payload.response ?? [], skippedReason: null };
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function statusFromApiFootball(shortStatus?: string) {
  if (!shortStatus) return "scheduled";
  if (FINISHED_STATUS.has(shortStatus)) return "finished";
  if (LIVE_STATUS.has(shortStatus)) return "live";
  return "scheduled";
}

export function scoresFromApiFootball(fixture: ApiFootballFixture) {
  const fulltimeHome = fixture.score?.fulltime?.home;
  const fulltimeAway = fixture.score?.fulltime?.away;
  const goalsHome = fixture.goals?.home;
  const goalsAway = fixture.goals?.away;

  return {
    homeScore: typeof fulltimeHome === "number" ? fulltimeHome : typeof goalsHome === "number" ? goalsHome : null,
    awayScore: typeof fulltimeAway === "number" ? fulltimeAway : typeof goalsAway === "number" ? goalsAway : null
  };
}

export async function fetchWorldCupFixturesByIds(fixtureIds: number[]) {
  const { apiKey, baseUrl } = getApiFootballConfig();
  if (!apiKey) {
    return { fixtures: new Map<number, ApiFootballFixture>(), skippedReason: "API_FOOTBALL_KEY fehlt." };
  }

  const fixtures = new Map<number, ApiFootballFixture>();

  for (const fixtureId of fixtureIds) {
    const response = await fetch(`${baseUrl}/fixtures?id=${fixtureId}`, {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`API-FOOTBALL Fehler fuer Fixture ${fixtureId}: ${response.status}`);
    }

    const payload = (await response.json()) as ApiFootballResponse;
    const fixture = payload.response?.[0];
    if (fixture?.fixture?.id) {
      fixtures.set(fixture.fixture.id, fixture);
    }
  }

  return { fixtures, skippedReason: null };
}

export async function fetchWorldCupFixturesInWindow(from: Date, to: Date) {
  const { leagueId, season } = getApiFootballConfig();
  const params = new URLSearchParams({
    league: String(leagueId),
    season: String(season),
    from: isoDate(from),
    to: isoDate(to),
    timezone: "Europe/Berlin"
  });

  const { fixtures, skippedReason } = await fetchApiFootballFixtures(params);
  return {
    fixtures,
    skippedReason,
    leagueId,
    season
  };
}
