import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ymrbfiuknkrgtqnzptua.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcmJmaXVrbmtyZ3RxbnpwdHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTQ1NjIsImV4cCI6MjA5NTY5MDU2Mn0.4gMvd7__aGZd4i-lyZdwaqlTWYZtx3dGatjYLWcGZzM'
);

const { error } = await supabase.rpc('exec_sql', {
  sql: `
    create table if not exists season_picks (
      id uuid primary key default gen_random_uuid(),
      fantasy_player_id uuid references fantasy_players(id) on delete cascade unique,
      contestant_id uuid references contestants(id) on delete cascade,
      repick_count int not null default 0,
      created_at timestamptz default now()
    );

    create table if not exists episode_picks (
      id uuid primary key default gen_random_uuid(),
      fantasy_player_id uuid references fantasy_players(id) on delete cascade,
      contestant_id uuid references contestants(id) on delete cascade,
      episode_number int not null,
      pick_type text not null check (pick_type in ('winner', 'loser')),
      unique(fantasy_player_id, contestant_id, episode_number)
    );
  `
});

if (error) console.error('Migration failed:', error.message);
else console.log('Migration complete.');
