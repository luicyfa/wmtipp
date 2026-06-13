alter table matches
  add column if not exists api_football_fixture_id bigint,
  add column if not exists last_synced_at timestamptz,
  add column if not exists sync_source text not null default 'manual';

create unique index if not exists matches_api_football_fixture_id_unique_idx
  on matches (api_football_fixture_id)
  where api_football_fixture_id is not null;
