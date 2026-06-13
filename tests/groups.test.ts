import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildGroupTables } from "../lib/groups.ts";
import type { Match } from "../lib/types.ts";

function match(
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
  matchNumber: number
): Match {
  return {
    id: String(matchNumber),
    match_number: matchNumber,
    round: "Gruppenphase",
    group_code: "A",
    home_team_id: null,
    away_team_id: null,
    home_team_label: home,
    away_team_label: away,
    kickoff_at: "2026-06-11T19:00:00.000Z",
    venue: null,
    status: "finished",
    home_score: homeScore,
    away_score: awayScore,
    winner_team_id: null,
    penalty_winner_team_id: null,
    created_at: "2026-06-11T19:00:00.000Z",
    updated_at: "2026-06-11T19:00:00.000Z"
  };
}

describe("buildGroupTables", () => {
  it("nutzt bei Punktgleichheit zuerst den direkten Vergleich der betroffenen Teams", () => {
    const [group] = buildGroupTables([
      match("A", "B", 1, 0, 1),
      match("B", "C", 3, 0, 2),
      match("C", "A", 2, 0, 3),
      match("A", "D", 5, 0, 4),
      match("B", "D", 1, 0, 5),
      match("C", "D", 1, 0, 6)
    ]);

    assert.deepEqual(group.standings.slice(0, 3).map((team) => team.teamName), ["B", "C", "A"]);
    assert.equal(group.standings[0].rankNote, "Direkter Vergleich");
  });

  it("markiert komplett unentschiedene Sonderfaelle zur manuellen Fairplay/FIFA-Pruefung", () => {
    const [group] = buildGroupTables([
      match("A", "B", 1, 1, 1),
      match("C", "D", 1, 1, 2),
      match("A", "C", 1, 1, 3),
      match("B", "D", 1, 1, 4),
      match("A", "D", 1, 1, 5),
      match("B", "C", 1, 1, 6)
    ]);

    assert.equal(group.standings.every((team) => team.needsManualTiebreaker), true);
    assert.equal(group.standings[0].rankNote, "Fairplay/FIFA-Ranking prüfen");
  });
});
