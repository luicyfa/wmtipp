export type ApiFootballFixture = {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      short?: string;
      long?: string;
      elapsed?: number | null;
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

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";
const FINISHED_STATUS = new Set(["FT", "AET", "PEN"]);
const LIVE_STATUS = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);

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
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return { fixtures: new Map<number, ApiFootballFixture>(), skippedReason: "API_FOOTBALL_KEY fehlt." };
  }

  const fixtures = new Map<number, ApiFootballFixture>();

  for (const fixtureId of fixtureIds) {
    const response = await fetch(`${API_FOOTBALL_BASE_URL}/fixtures?id=${fixtureId}`, {
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
