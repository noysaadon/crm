-- הדבקי את הקוד הזה ב-SQL Editor של Supabase

create table leads (
  id bigserial primary key,
  name text not null,
  phone text,
  email text,
  city text,
  budget integer default 0,
  source text default 'אחר',
  priority text default 'בינונית',
  status text default 'new',
  notes text,
  assigned text,
  fb_msg text,
  date text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- מאפשר לכל משתמשים מחוברים לקרוא ולכתוב
alter table leads enable row level security;

create policy "Authenticated users can do everything"
  on leads
  for all
  to authenticated
  using (true)
  with check (true);

-- עדכון אוטומטי של updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();
