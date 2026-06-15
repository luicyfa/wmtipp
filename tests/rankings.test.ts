import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankForPlayer, rankForRow } from "../lib/ranking-places.ts";
import type { RankingRow } from "../lib/types.ts";

function row(id: string, points: number, exact: number, name = id): RankingRow {
  return {
    player_id: id,
    name,
    total_points: points,
    exact_scores: exact,
    correct_tendencies: 0,
    predicted_matches: 0,
    open_predictions: 0,
    last_points_at: null
  };
}

describe("ranking places", () => {
  it("vergibt gleiche Plaetze bei gleichen Punkten und gleichen exakten Tipps", () => {
    const rankings = [
      row("a", 10, 2),
      row("b", 10, 2),
      row("c", 10, 1),
      row("d", 8, 4)
    ];

    assert.deepEqual(rankings.map((_, index) => rankForRow(rankings, index)), [1, 1, 3, 4]);
    assert.equal(rankForPlayer(rankings, "b"), 1);
    assert.equal(rankForPlayer(rankings, "c"), 3);
  });
});
