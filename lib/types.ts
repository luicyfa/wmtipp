export type Player = {
  id: string;
  name: string;
  pin_hash: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  short_name: string | null;
  country_code: string | null;
  group_code: string | null;
  placeholder: boolean;
  created_at: string;
};

export type MatchStatus = "scheduled" | "live" | "finished";

export type Match = {
  id: string;
  match_number: number | null;
  round: string;
  group_code: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_label: string | null;
  away_team_label: string | null;
  kickoff_at: string;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  penalty_winner_team_id: string | null;
  api_football_fixture_id?: number | null;
  last_synced_at?: string | null;
  sync_source?: string | null;
  created_at: string;
  updated_at: string;
  home_team?: Pick<Team, "name" | "short_name"> | null;
  away_team?: Pick<Team, "name" | "short_name"> | null;
};

export type Prediction = {
  id: string;
  player_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number;
  exact_score: boolean;
  correct_tendency: boolean;
  correct_goal_difference: boolean;
  correct_home_goals: boolean;
  correct_away_goals: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  player?: Pick<Player, "id" | "name" | "is_admin" | "is_active"> | null;
};

export type BonusPrediction = {
  id: string;
  player_id: string;
  type: string;
  team_id: string | null;
  value: string | null;
  points: number;
  locked_at: string | null;
  created_at: string;
  team?: Pick<Team, "id" | "name" | "short_name"> | null;
};

export type ScoreRules = {
  id?: string;
  exact_score_points: number;
  tendency_points: number;
  goal_difference_points: number;
  team_goals_points: number;
};

export type RankingRow = {
  player_id: string;
  name: string;
  total_points: number;
  exact_scores: number;
  correct_tendencies: number;
  predicted_matches: number;
  open_predictions: number;
  last_points_at: string | null;
};
