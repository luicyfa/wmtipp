import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculatePredictionPoints, isPredictionLocked } from "../lib/scoring.ts";

const rules = {
  exact_score_points: 5,
  tendency_points: 3,
  goal_difference_points: 1,
  team_goals_points: 0
};

function score(prediction: [number, number], match: [number | null, number | null]) {
  return calculatePredictionPoints(
    { home_score: prediction[0], away_score: prediction[1] },
    { home_score: match[0], away_score: match[1] },
    rules
  );
}

describe("calculatePredictionPoints", () => {
  it("vergibt 5 Punkte fuer ein exaktes Ergebnis", () => {
    assert.deepEqual(
      { points: score([2, 1], [2, 1]).points, exact_score: score([2, 1], [2, 1]).exact_score },
      { points: 5, exact_score: true }
    );
  });

  it("vergibt Tendenz plus Tordifferenz", () => {
    const result = score([3, 2], [2, 1]);
    assert.equal(result.points, 4);
    assert.equal(result.correct_tendency, true);
    assert.equal(result.correct_goal_difference, true);
  });

  it("vergibt 0 Punkte bei falscher Tendenz ohne Treffer", () => {
    const result = score([0, 1], [2, 1]);
    assert.equal(result.points, 0);
    assert.equal(result.correct_tendency, false);
  });

  it("wertet ein richtiges Unentschieden mit Tendenz und Tordifferenz", () => {
    const result = score([2, 2], [1, 1]);
    assert.equal(result.points, 4);
    assert.equal(result.correct_tendency, true);
    assert.equal(result.correct_goal_difference, true);
  });

  it("erkennt richtige Tordifferenz", () => {
    const result = score([1, 0], [2, 1]);
    assert.equal(result.points, 4);
    assert.equal(result.correct_goal_difference, true);
  });

  it("erkennt richtige Heimtore", () => {
    const result = score([2, 0], [2, 1]);
    assert.equal(result.points, 3);
    assert.equal(result.correct_home_goals, true);
  });

  it("erkennt richtige Auswaertstore", () => {
    const result = score([3, 1], [2, 1]);
    assert.equal(result.points, 3);
    assert.equal(result.correct_away_goals, true);
  });

  it("vergibt keinen Zusatzpunkt nur fuer null Gegentore", () => {
    const result = score([2, 0], [6, 0]);
    assert.equal(result.points, 3);
    assert.equal(result.correct_away_goals, true);
    assert.equal(result.correct_goal_difference, false);
  });

  it("vergibt vier Punkte fuer die richtige Tordifferenz", () => {
    const result = score([7, 1], [6, 0]);
    assert.equal(result.points, 4);
    assert.equal(result.correct_goal_difference, true);
  });

  it("vergibt 0 Punkte ohne korrekte Einzelwertung", () => {
    assert.equal(score([0, 1], [2, 1]).points, 0);
  });

  it("vergibt 0 Punkte bei fehlendem Spielergebnis", () => {
    assert.deepEqual(score([2, 1], [null, null]), {
      points: 0,
      exact_score: false,
      correct_tendency: false,
      correct_goal_difference: false,
      correct_home_goals: false,
      correct_away_goals: false,
      correct_advancing_team: false,
      advancing_points: 0
    });
  });

  it("vergibt im K.-o.-Spiel einen Zusatzpunkt fuer das richtige Weiterkommen", () => {
    const result = calculatePredictionPoints(
      { home_score: 1, away_score: 1, advancing_team_id: "team-home" },
      { home_score: 1, away_score: 1, winner_team_id: "team-home" },
      rules
    );

    assert.equal(result.points, 6);
    assert.equal(result.correct_advancing_team, true);
    assert.equal(result.advancing_points, 1);
  });

  it("vergibt den Weiterkommer-Zusatzpunkt nur bei getipptem Unentschieden", () => {
    const result = calculatePredictionPoints(
      { home_score: 2, away_score: 1, advancing_team_id: "team-home" },
      { home_score: 2, away_score: 1, winner_team_id: "team-home" },
      rules
    );

    assert.equal(result.points, 5);
    assert.equal(result.correct_advancing_team, false);
    assert.equal(result.advancing_points, 0);
  });
});

describe("isPredictionLocked", () => {
  it("sperrt Tipps ab Anstoss", () => {
    assert.equal(isPredictionLocked("2026-06-11T21:00:00.000Z", new Date("2026-06-11T21:00:00.000Z")), true);
    assert.equal(isPredictionLocked("2026-06-11T21:00:00.000Z", new Date("2026-06-11T20:59:59.000Z")), false);
  });
});
