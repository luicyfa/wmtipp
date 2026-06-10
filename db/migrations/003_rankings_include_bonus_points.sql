create or replace function get_rankings()
returns table (
  player_id uuid,
  name text,
  total_points bigint,
  exact_scores bigint,
  correct_tendencies bigint,
  predicted_matches bigint,
  open_predictions bigint,
  last_points_at timestamptz
)
language sql
stable
as $$
  with active_players as (
    select id, players.name from players where is_active = true
  ),
  open_matches as (
    select count(*) as total from matches where kickoff_at > now()
  ),
  prediction_stats as (
    select
      p.id as player_id,
      coalesce(sum(pr.points), 0) as prediction_points,
      coalesce(sum(case when pr.exact_score then 1 else 0 end), 0) as exact_scores,
      coalesce(sum(case when pr.correct_tendency then 1 else 0 end), 0) as correct_tendencies,
      count(pr.id) as predicted_matches,
      greatest((select total from open_matches) - count(pr.id) filter (where m.kickoff_at > now()), 0) as open_predictions,
      max(case when pr.points > 0 then pr.updated_at end) as last_prediction_points_at
    from active_players p
    left join predictions pr on pr.player_id = p.id
    left join matches m on m.id = pr.match_id
    group by p.id
  ),
  bonus_stats as (
    select
      player_id,
      coalesce(sum(points), 0) as bonus_points,
      max(created_at) filter (where points > 0) as last_bonus_points_at
    from bonus_predictions
    group by player_id
  )
  select
    p.id as player_id,
    p.name,
    coalesce(ps.prediction_points, 0) + coalesce(bs.bonus_points, 0) as total_points,
    coalesce(ps.exact_scores, 0) as exact_scores,
    coalesce(ps.correct_tendencies, 0) as correct_tendencies,
    coalesce(ps.predicted_matches, 0) as predicted_matches,
    coalesce(ps.open_predictions, (select total from open_matches)) as open_predictions,
    greatest(ps.last_prediction_points_at, bs.last_bonus_points_at) as last_points_at
  from active_players p
  left join prediction_stats ps on ps.player_id = p.id
  left join bonus_stats bs on bs.player_id = p.id
  order by total_points desc, exact_scores desc, correct_tendencies desc, p.name asc;
$$;
