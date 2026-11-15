create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.music_sessions (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  preferred_genre text not null,
  transcript text,
  transcript_status text not null default 'TEMPORARY',
  source text not null check (source in ('SIMULATOR', 'PLEOS')),
  context jsonb,
  started_at timestamptz not null,
  ended_at timestamptz
);

create table if not exists public.generation_jobs (
  id uuid primary key,
  session_id uuid not null references public.music_sessions(id) on delete cascade,
  status text not null check (status in (
    'PENDING', 'ANALYZING', 'GENERATING_LYRICS', 'GENERATING_MUSIC',
    'UPLOADING', 'COMPLETED', 'FAILED'
  )),
  progress integer not null default 0 check (progress between 0 and 100),
  memory_id uuid,
  provider_used text check (provider_used in ('GOOGLE', 'DEMO')),
  fallback_reason text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.music_memories (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  session_id uuid not null references public.music_sessions(id) on delete cascade,
  title text not null,
  summary text not null,
  lyrics text not null,
  genre text not null,
  audio_url text not null,
  audio_extension text not null default 'wav' check (audio_extension in ('wav', 'mp3')),
  source text not null check (source in ('SIMULATOR', 'PLEOS')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  altitude double precision,
  heading double precision not null,
  location_accuracy double precision not null,
  vehicle_speed double precision not null,
  temperature double precision,
  weather_condition text,
  time_of_day text not null,
  analysis jsonb not null,
  provider text not null default 'DEMO' check (provider in ('GOOGLE', 'DEMO')),
  created_at timestamptz not null default now()
);

alter table public.generation_jobs
  drop constraint if exists generation_jobs_memory_id_fkey;
alter table public.generation_jobs
  add constraint generation_jobs_memory_id_fkey
  foreign key (memory_id) references public.music_memories(id) on delete set null;

create index if not exists music_memories_location_idx
  on public.music_memories (latitude, longitude);
create index if not exists music_memories_created_at_idx
  on public.music_memories (created_at desc);

create table if not exists public.playback_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  memory_id uuid not null references public.music_memories(id) on delete cascade,
  played_at timestamptz not null default now(),
  trigger_type text not null check (trigger_type in ('MANUAL', 'GEOFENCE'))
);

alter table public.generation_jobs
  add column if not exists memory_id uuid,
  add column if not exists provider_used text,
  add column if not exists fallback_reason text;
alter table public.music_memories
  add column if not exists audio_extension text not null default 'wav',
  add column if not exists provider text not null default 'DEMO';
alter table public.music_sessions
  add column if not exists context jsonb;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_memory_id_fkey;
alter table public.generation_jobs
  add constraint generation_jobs_memory_id_fkey
  foreign key (memory_id) references public.music_memories(id) on delete set null;

alter table public.users enable row level security;
alter table public.music_sessions enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.music_memories enable row level security;
alter table public.playback_history enable row level security;

insert into storage.buckets (id, name, public)
values ('welody-music', 'welody-music', false)
on conflict (id) do nothing;
