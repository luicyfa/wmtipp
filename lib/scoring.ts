import type { Match, Prediction, ScoreRules } from "@/lib/types";

export type ScoringResult = {
  points: number;
  exact_score: boolean;
  correct_tendency: boolean;
  correct_goal_difference: boolean;
  correct_home_goals: boolean;
  correct_away_goals: boolean;
  correct_advancing_team: boolean;
  advancing_points: number;
};

export const defaultScoreRules: ScoreRules = {
  exact_score_points: 5,
  tendency_points: 3,
  goal_difference_points: 1,
  team_goals_points: 1
};

type ScoreLike = Pick<Prediction, "home_score" | "away_score"> & {
  advancing_team_id?: string | null;
};
type MatchScoreLike = Pick<Match, "home_score" | "away_score"> & {
  winner_team_id?: string | null;
};

function tendency(home: number, away: number) {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function calculatePredictionPoints(
  prediction: ScoreLike,
  match: MatchScoreLike,
  scoreRules: ScoreRules = defaultScoreRules
): ScoringResult {
  const empty: ScoringResult = {
    points: 0,
    exact_score: false,
    correct_tendency: false,
    correct_goal_difference: false,
    correct_home_goals: false,
    correct_away_goals: false,
    correct_advancing_team: false,
    advancing_points: 0
  };

  if (match.home_score === null || match.away_score === null) {
    return empty;
  }

  const exact =
    prediction.home_score === match.home_score && prediction.away_score === match.away_score;
  const correctAdvancingTeam = Boolean(
    prediction.advancing_team_id &&
    match.winner_team_id &&
    prediction.advancing_team_id === match.winner_team_id
  );
  const advancingPoints = correctAdvancingTeam ? 1 : 0;

  if (exact) {
    return {
      points: scoreRules.exact_score_points + advancingPoints,
      exact_score: true,
      correct_tendency: true,
      correct_goal_difference: true,
      correct_home_goals: true,
      correct_away_goals: true,
      correct_advancing_team: correctAdvancingTeam,
      advancing_points: advancingPoints
    };
  }

  const actualTendency = tendency(match.home_score, match.away_score);
  const predictedTendency = tendency(prediction.home_score, prediction.away_score);
  const correct_tendency = actualTendency === predictedTendency;
  const correct_goal_difference =
    prediction.home_score - prediction.away_score === match.home_score - match.away_score;
  const correct_home_goals = prediction.home_score === match.home_score;
  const correct_away_goals = prediction.away_score === match.away_score;

  let points = 0;
  if (correct_tendency) {
    points += scoreRules.tendency_points;
    if (correct_goal_difference) points += scoreRules.goal_difference_points;
  }

  return {
    points: points + advancingPoints,
    exact_score: false,
    correct_tendency,
    correct_goal_difference,
    correct_home_goals,
    correct_away_goals,
    correct_advancing_team: correctAdvancingTeam,
    advancing_points: advancingPoints
  };
}

export function isPredictionLocked(kickoffAt: string | Date, now: Date = new Date()) {
  return new Date(kickoffAt).getTime() <= now.getTime();
}
