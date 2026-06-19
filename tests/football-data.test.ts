import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoresFromFootballData } from "../lib/football-data.ts";

describe("scoresFromFootballData", () => {
  it("nutzt bei normalen Spielen fullTime, wenn regularTime leer ist", () => {
    const result = scoresFromFootballData({
      id: 1,
      utcDate: "2026-06-19T19:00:00Z",
      status: "FINISHED",
      score: {
        duration: "REGULAR",
        winner: "HOME_TEAM",
        fullTime: { home: 2, away: 0 },
        regularTime: { home: null, away: null }
      }
    });

    assert.equal(result.homeScore, 2);
    assert.equal(result.awayScore, 0);
  });

  it("nutzt bei K.-o.-Spielen das Ergebnis nach 90 Minuten", () => {
    const result = scoresFromFootballData({
      id: 2,
      utcDate: "2026-07-04T19:00:00Z",
      status: "FINISHED",
      score: {
        duration: "EXTRA_TIME",
        winner: "HOME_TEAM",
        fullTime: { home: 2, away: 1 },
        regularTime: { home: 1, away: 1 },
        extraTime: { home: 1, away: 0 }
      }
    });

    assert.equal(result.homeScore, 1);
    assert.equal(result.awayScore, 1);
    assert.equal(result.extraTimeHomeScore, 1);
    assert.equal(result.extraTimeAwayScore, 0);
  });
});
