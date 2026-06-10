import { createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultScoreRules } from "@/lib/scoring";
import type { Match, Player, Prediction, ScoreRules } from "@/lib/types";

export async function getScoreRules(): Promise<ScoreRules> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("score_rules")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as ScoreRules | null) ?? defaultScoreRules;
}

export async function getMatches(): Promise<Match[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*,home_team:home_team_id(name,short_name),away_team:away_team_id(name,short_name)")
    .order("kickoff_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Match[];
}

export async function getMatch(id: string): Promise<Match> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*,home_team:home_team_id(name,short_name),away_team:away_team_id(name,short_name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Match;
}

export async function getPlayerPredictions(playerId: string): Promise<Prediction[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("player_id", playerId);

  if (error) throw error;
  return (data ?? []) as Prediction[];
}

export async function getPrediction(playerId: string, matchId: string): Promise<Prediction | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("player_id", playerId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (error) throw error;
  return data as Prediction | null;
}

export async function getVisiblePredictions(matchId: string): Promise<Prediction[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*,player:players(id,name)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Prediction[];
}

export async function getPlayers(includeInactive = false): Promise<Player[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase.from("players").select("*").order("name", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Player[];
}
