-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  goal text check (goal in ('save_money', 'eat_healthy', 'learn_to_cook', 'save_time')),
  weekly_budget numeric default 50,
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  dietary_restrictions text[] default '{}',
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Meals table
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  ingredients jsonb default '[]',
  instructions jsonb default '[]',
  calories integer default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  estimated_cost numeric default 0,
  prep_time_min integer default 0,
  cook_time_min integer default 0,
  difficulty text default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  meal_type text[] default '{}',
  tags text[] default '{}',
  is_ai_generated boolean default false,
  created_at timestamptz default now()
);

-- Meal plan items table
create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz default now(),
  unique (user_id, date, slot)
);

-- Indexes
create index if not exists idx_meals_user_id on public.meals(user_id);
create index if not exists idx_meal_plan_items_user_date on public.meal_plan_items(user_id, date);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_plan_items enable row level security;

-- RLS Policies: profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS Policies: meals
create policy "Users can view own meals"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Users can insert own meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meals"
  on public.meals for update
  using (auth.uid() = user_id);

create policy "Users can delete own meals"
  on public.meals for delete
  using (auth.uid() = user_id);

-- RLS Policies: meal_plan_items
create policy "Users can view own plan items"
  on public.meal_plan_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own plan items"
  on public.meal_plan_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plan items"
  on public.meal_plan_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own plan items"
  on public.meal_plan_items for delete
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
