import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ymrbfiuknkrgtqnzptua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcmJmaXVrbmtyZ3RxbnpwdHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTQ1NjIsImV4cCI6MjA5NTY5MDU2Mn0.4gMvd7__aGZd4i-lyZdwaqlTWYZtx3dGatjYLWcGZzM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const contestants = [
  { name: 'Myki Meeks',        active: true  }, // Winner
  { name: 'Nini Coco',         active: true  }, // Runner-up
  { name: 'Darlene Mitchell',  active: false }, // 3rd place
  { name: 'Juicy Love Dion',   active: false }, // 4th place
  { name: "Jane Don't",        active: false }, // 5th place
  { name: 'Discord Addams',    active: false }, // 6th place
  { name: 'Kenya Pleaser',     active: false }, // 7th place
  { name: 'Athena Dion',       active: false }, // 8th place
  { name: 'Mia Starr',         active: false }, // 9th place
  { name: 'Vita VonTesse Starr', active: false }, // 10th place
  { name: 'Ciara Myst',        active: false }, // 11th place
  { name: 'Briar Blush',       active: false }, // 12th place
  { name: 'Mandy Mango',       active: false }, // 13th place
  { name: 'DD Fuego',          active: false }, // 14th place
];

const { data: contestantData, error: contestantError } = await supabase
  .from('contestants')
  .insert(contestants)
  .select();

if (contestantError) {
  console.error('Contestant seed failed:', contestantError.message);
  process.exit(1);
}

console.log(`Seeded ${contestantData.length} contestants:`);
contestantData.forEach(c => console.log(`  ${c.active ? '✓' : '✗'} ${c.name} (${c.id})`));

const players = [
  { name: 'Michelle' },
  { name: 'Edgar' },
  { name: 'Dani' },
  { name: 'Xander' },
  { name: 'David' },
];

const { data: playerData, error: playerError } = await supabase
  .from('fantasy_players')
  .insert(players)
  .select();

if (playerError) {
  console.error('Player seed failed:', playerError.message);
  process.exit(1);
}

console.log(`\nSeeded ${playerData.length} fantasy players:`);
playerData.forEach(p => console.log(`  ${p.name} (${p.id})`));
