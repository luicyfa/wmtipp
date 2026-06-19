alter table matches
  add column if not exists prediction_open boolean not null default true,
  add column if not exists regular_home_score integer,
  add column if not exists regular_away_score integer,
  add column if not exists extra_time_home_score integer,
  add column if not exists extra_time_away_score integer,
  add column if not exists penalty_home_score integer,
  add column if not exists penalty_away_score integer,
  add column if not exists result_duration text not null default 'REGULAR'
    check (result_duration in ('REGULAR', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'));

alter table predictions
  add column if not exists advancing_team_id uuid references teams(id) on delete set null,
  add column if not exists correct_advancing_team boolean not null default false,
  add column if not exists advancing_points integer not null default 0;

create table if not exists prediction_archive (
  archive_id uuid primary key default gen_random_uuid(),
  original_prediction_id uuid not null,
  player_id uuid not null references players(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  points integer not null default 0,
  advancing_team_id uuid references teams(id) on delete set null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz not null default now(),
  archived_reason text not null
);

create unique index if not exists prediction_archive_original_id_idx
  on prediction_archive(original_prediction_id);

update matches m
set
  home_team_id = home_team.id,
  away_team_id = away_team.id
from teams home_team, teams away_team
where m.round = 'Gruppenphase'
  and lower(home_team.name) = lower(m.home_team_label)
  and lower(away_team.name) = lower(m.away_team_label)
  and (m.home_team_id is null or m.away_team_id is null);

insert into prediction_archive (
  original_prediction_id,
  player_id,
  match_id,
  home_score,
  away_score,
  points,
  advancing_team_id,
  created_at,
  updated_at,
  archived_reason
)
select
  p.id,
  p.player_id,
  p.match_id,
  p.home_score,
  p.away_score,
  p.points,
  p.advancing_team_id,
  p.created_at,
  p.updated_at,
  'K.-o.-Tipp wurde abgegeben, bevor die echten Mannschaften feststanden.'
from predictions p
join matches m on m.id = p.match_id
where m.round <> 'Gruppenphase'
on conflict (original_prediction_id) do nothing;

delete from predictions p
using matches m
where m.id = p.match_id
  and m.round <> 'Gruppenphase';

update matches
set prediction_open = (round = 'Gruppenphase');

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
    select id, players.name
    from players
    where is_active = true and is_admin = false
  ),
  open_matches as (
    select count(*) as total
    from matches
    where kickoff_at > now() and prediction_open = true
  ),
  prediction_stats as (
    select
      p.id as player_id,
      coalesce(sum(pr.points), 0) as prediction_points,
      coalesce(sum(case when pr.exact_score then 1 else 0 end), 0) as exact_scores,
      coalesce(sum(case when pr.correct_tendency then 1 else 0 end), 0) as correct_tendencies,
      count(pr.id) as predicted_matches,
      greatest(
        (select total from open_matches) -
        count(pr.id) filter (where m.kickoff_at > now() and m.prediction_open = true),
        0
      ) as open_predictions,
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
  order by total_points desc, exact_scores desc, p.name asc;
$$;

alter table prediction_archive enable row level security;
