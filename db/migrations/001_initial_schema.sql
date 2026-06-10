create extension if not exists pgcrypto;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists players_name_unique_idx on players (lower(name));

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  country_code text,
  group_code text,
  placeholder boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists teams_name_unique_idx on teams (lower(name));

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  match_number integer unique,
  round text not null,
  group_code text,
  home_team_id uuid references teams(id) on delete set null,
  away_team_id uuid references teams(id) on delete set null,
  home_team_label text,
  away_team_label text,
  kickoff_at timestamptz not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  home_score integer,
  away_score integer,
  winner_team_id uuid references teams(id) on delete set null,
  penalty_winner_team_id uuid references teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  points integer not null default 0,
  exact_score boolean not null default false,
  correct_tendency boolean not null default false,
  correct_goal_difference boolean not null default false,
  correct_home_goals boolean not null default false,
  correct_away_goals boolean not null default false,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, match_id)
);

create table if not exists score_rules (
  id uuid primary key default gen_random_uuid(),
  exact_score_points integer not null default 5,
  tendency_points integer not null default 3,
  goal_difference_points integer not null default 1,
  team_goals_points integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bonus_predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  type text not null,
  team_id uuid references teams(id) on delete set null,
  value text,
  points integer not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists players_touch_updated_at on players;
create trigger players_touch_updated_at before update on players
for each row execute function touch_updated_at();

drop trigger if exists matches_touch_updated_at on matches;
create trigger matches_touch_updated_at before update on matches
for each row execute function touch_updated_at();

drop trigger if exists predictions_touch_updated_at on predictions;
create trigger predictions_touch_updated_at before update on predictions
for each row execute function touch_updated_at();

drop trigger if exists score_rules_touch_updated_at on score_rules;
create trigger score_rules_touch_updated_at before update on score_rules
for each row execute function touch_updated_at();

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
  )
  select
    p.id as player_id,
    p.name,
    coalesce(sum(pr.points), 0) as total_points,
    coalesce(sum(case when pr.exact_score then 1 else 0 end), 0) as exact_scores,
    coalesce(sum(case when pr.correct_tendency then 1 else 0 end), 0) as correct_tendencies,
    count(pr.id) as predicted_matches,
    greatest((select total from open_matches) - count(pr.id) filter (where m.kickoff_at > now()), 0) as open_predictions,
    max(case when pr.points > 0 then pr.updated_at end) as last_points_at
  from active_players p
  left join predictions pr on pr.player_id = p.id
  left join matches m on m.id = pr.match_id
  group by p.id, p.name
  order by total_points desc, exact_scores desc, correct_tendencies desc, p.name asc;
$$;

alter table players enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table score_rules enable row level security;
alter table bonus_predictions enable row level security;
