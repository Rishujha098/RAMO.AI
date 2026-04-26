-- RAMO.AI initial schema (MVP)

-- Extensions
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  target_role text,
  experience_level text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Sessions
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  experience_level text not null,
  interview_type text not null check (interview_type in ('technical', 'hr', 'mixed')),
  question_count int not null check (question_count between 1 and 50),
  audio_opt_in boolean not null default false,
  resume_path text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now()
);
create index if not exists interview_sessions_user_id_idx on public.interview_sessions(user_id);
create index if not exists interview_sessions_created_at_idx on public.interview_sessions(created_at desc);

-- Questions
create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  order_index int not null,
  question_text text not null,
  category text not null check (category in ('technical', 'hr')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  source text not null default 'ai',
  created_at timestamptz not null default now(),
  unique(session_id, order_index)
);
create index if not exists interview_questions_session_id_idx on public.interview_questions(session_id);

-- Answers
create table if not exists public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  question_id uuid not null references public.interview_questions(id) on delete cascade,
  answer_mode text not null check (answer_mode in ('text', 'voice')),
  transcript text not null,
  response_latency_ms int,
  audio_duration_ms int,
  audio_path text,
  audio_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  unique(question_id)
);
create index if not exists interview_answers_session_id_idx on public.interview_answers(session_id);
create index if not exists interview_answers_audio_uploaded_at_idx on public.interview_answers(audio_uploaded_at);

-- Evaluations
create table if not exists public.answer_evaluations (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references public.interview_answers(id) on delete cascade,
  overall_score int not null check (overall_score between 0 and 100),
  rubric_scores jsonb not null,
  strengths text[] not null,
  improvements text[] not null,
  ideal_answer text not null,
  confidence_signals jsonb,
  created_at timestamptz not null default now()
);
create index if not exists answer_evaluations_answer_id_idx on public.answer_evaluations(answer_id);

-- Final report
create table if not exists public.session_reports (
  session_id uuid primary key references public.interview_sessions(id) on delete cascade,
  summary text not null,
  category_scores jsonb not null,
  weak_areas text[] not null,
  next_practice_plan text[] not null,
  generated_at timestamptz not null default now()
);

-- Helper: create profile on sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, created_at)
  values (new.id, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Helper: admin check
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.user_id = uid and p.is_admin = true
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_answers enable row level security;
alter table public.answer_evaluations enable row level security;
alter table public.session_reports enable row level security;

-- profiles policies
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (user_id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "profiles_admin_select_all" on public.profiles
for select to authenticated
using (public.is_admin(auth.uid()));

-- sessions policies
create policy "sessions_crud_own" on public.interview_sessions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "sessions_admin_select_all" on public.interview_sessions
for select to authenticated
using (public.is_admin(auth.uid()));

-- questions policies
create policy "questions_crud_own" on public.interview_questions
for all to authenticated
using (
  exists(
    select 1 from public.interview_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
)
with check (
  exists(
    select 1 from public.interview_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
);

create policy "questions_admin_select_all" on public.interview_questions
for select to authenticated
using (public.is_admin(auth.uid()));

-- answers policies
create policy "answers_crud_own" on public.interview_answers
for all to authenticated
using (
  exists(
    select 1 from public.interview_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
)
with check (
  exists(
    select 1 from public.interview_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
);

create policy "answers_admin_select_all" on public.interview_answers
for select to authenticated
using (public.is_admin(auth.uid()));

-- evaluations policies
create policy "evaluations_crud_own" on public.answer_evaluations
for all to authenticated
using (
  exists(
    select 1
    from public.interview_answers a
    join public.interview_sessions s on s.id = a.session_id
    where a.id = answer_id and s.user_id = auth.uid()
  )
)
with check (
  exists(
    select 1
    from public.interview_answers a
    join public.interview_sessions s on s.id = a.session_id
    where a.id = answer_id and s.user_id = auth.uid()
  )
);

create policy "evaluations_admin_select_all" on public.answer_evaluations
for select to authenticated
using (public.is_admin(auth.uid()));

-- reports policies
create policy "reports_crud_own" on public.session_reports
for all to authenticated
using (
  exists(
    select 1 from public.interview_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
)
with check (
  exists(
    select 1 from public.interview_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
);

create policy "reports_admin_select_all" on public.session_reports
for select to authenticated
using (public.is_admin(auth.uid()));

-- Storage policies (run after buckets are created)
-- Resumes: private, user can insert/select/delete only their own path prefix
create policy "resumes_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'resumes'
  and name like (auth.uid()::text || '/%')
);

create policy "resumes_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'resumes'
  and name like (auth.uid()::text || '/%')
);

create policy "resumes_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'resumes'
  and name like (auth.uid()::text || '/%')
);

-- Audio: private, user can insert/select/delete only their own path prefix
create policy "audio_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'audio'
  and name like (auth.uid()::text || '/%')
);

create policy "audio_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'audio'
  and name like (auth.uid()::text || '/%')
);

create policy "audio_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'audio'
  and name like (auth.uid()::text || '/%')
);
