-- This file contains the SQL to set up automatic profile creation on user signup
-- Run this in your Supabase SQL Editor

-- 1. Create a function that creates a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (auth_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Create a trigger that calls the function when a new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Enable RLS (Row Level Security) on profiles table
alter table public.profiles enable row level security;

-- 4. Create RLS policies for profiles
-- Allow users to read their own profile
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = auth_id);

-- Allow users to update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = auth_id);

-- Allow anyone to read public profile info (for team features)
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- 5. Grant permissions
grant usage on schema public to anon, authenticated;
grant all on public.profiles to anon, authenticated;
grant execute on function public.handle_new_user() to anon, authenticated;
