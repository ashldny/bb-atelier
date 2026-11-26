-- Bb Atelier theme gallery.
-- Shared themes are colours plus a short name (and an optional display name). The popup
-- never touches the tables: anon callers only get the four functions below, which
-- validate input, rate-limit by an anonymous per-install id (stored only as a SHA-256
-- hash) and hide a theme after three reports from different installs.

create extension if not exists pgcrypto with schema extensions;

create table public.gallery_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  author text check (author is null or char_length(author) between 1 and 30),
  page_bg text not null check (page_bg ~ '^#[0-9a-f]{6}$'),
  accent text not null check (accent ~ '^#[0-9a-f]{6}$'),
  navbar text check (navbar is null or navbar ~ '^#[0-9a-f]{6}$'),
  page_text text check (page_text is null or page_text ~ '^#[0-9a-f]{6}$'),
  owner_hash text not null,
  uses integer not null default 0,
  reports integer not null default 0,
  created_at timestamptz not null default now()
);
create index gallery_themes_visible_new on public.gallery_themes (created_at desc) where reports < 3;
create index gallery_themes_visible_popular on public.gallery_themes (uses desc, created_at desc) where reports < 3;
create index gallery_themes_owner on public.gallery_themes (owner_hash, created_at desc);
-- One copy of each palette: re-sharing the same colours is rejected.
create unique index gallery_themes_palette on public.gallery_themes (page_bg, accent, coalesce(navbar, ''), coalesce(page_text, ''));

create table public.gallery_reports (
  theme_id uuid not null references public.gallery_themes (id) on delete cascade,
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  primary key (theme_id, reporter_hash)
);

create table public.gallery_uses (
  theme_id uuid not null references public.gallery_themes (id) on delete cascade,
  user_hash text not null,
  primary key (theme_id, user_hash)
);

alter table public.gallery_themes enable row level security;
alter table public.gallery_reports enable row level security;
alter table public.gallery_uses enable row level security;
-- No policies: only the security-definer functions below can read or write.

create or replace function public.gallery_hash(install_id uuid)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest('bb-atelier:' || install_id::text, 'sha256'), 'hex');
$$;

create or replace function public.gallery_clean_text(value text, max_len int)
returns text language plpgsql immutable set search_path = '' as $$
declare cleaned text;
begin
  if value is null then return null; end if;
  -- Collapse whitespace, drop control characters, keep letters, numbers and light punctuation.
  cleaned := btrim(regexp_replace(regexp_replace(value, '[[:cntrl:]]', '', 'g'), '\s+', ' ', 'g'));
  if cleaned = '' then return null; end if;
  if char_length(cleaned) > max_len then
    raise exception 'too long' using errcode = '22001';
  end if;
  if cleaned !~ '^[[:alnum:] ''’&().,!?+#:/-]+$' or cleaned ~* '(https?:|www\.|\.com\y)' then
    raise exception 'invalid characters' using errcode = '22023';
  end if;
  return cleaned;
end;
$$;

create or replace function public.gallery_list(sort text default 'popular', page_size int default 30, page_offset int default 0, install_id uuid default null)
returns table (id uuid, name text, author text, page_bg text, accent text, navbar text, page_text text, uses int, created_at timestamptz, mine boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.name, t.author, t.page_bg, t.accent, t.navbar, t.page_text, t.uses, t.created_at,
         install_id is not null and t.owner_hash = public.gallery_hash(install_id)
  from public.gallery_themes t
  where t.reports < 3
  order by case when sort = 'new' then null else t.uses end desc nulls last, t.created_at desc
  limit least(greatest(page_size, 1), 50) offset greatest(page_offset, 0);
$$;

create or replace function public.gallery_share(install_id uuid, theme_name text, author_name text, page_bg text, accent text, navbar text default null, page_text text default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  owner_key text := public.gallery_hash(install_id);
  new_id uuid;
begin
  if (select count(*) from public.gallery_themes t where t.owner_hash = owner_key and t.created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate limited' using errcode = 'P0001', hint = 'limit';
  end if;
  insert into public.gallery_themes (name, author, page_bg, accent, navbar, page_text, owner_hash)
  values (
    coalesce(public.gallery_clean_text(theme_name, 40), 'Untitled'),
    public.gallery_clean_text(author_name, 30),
    lower(page_bg), lower(accent), lower(navbar), lower(page_text), owner_key
  )
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'already shared' using errcode = 'P0001', hint = 'duplicate';
end;
$$;

create or replace function public.gallery_use(install_id uuid, theme_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into public.gallery_uses (theme_id, user_hash) values (theme_id, public.gallery_hash(install_id))
  on conflict do nothing;
  if found then
    update public.gallery_themes t set uses = t.uses + 1 where t.id = gallery_use.theme_id;
  end if;
end;
$$;

create or replace function public.gallery_report(install_id uuid, theme_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into public.gallery_reports (theme_id, reporter_hash) values (theme_id, public.gallery_hash(install_id))
  on conflict do nothing;
  if found then
    update public.gallery_themes t set reports = t.reports + 1 where t.id = gallery_report.theme_id;
  end if;
end;
$$;

create or replace function public.gallery_unshare(install_id uuid, theme_id uuid)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.gallery_themes t where t.id = theme_id and t.owner_hash = public.gallery_hash(install_id);
$$;

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.gallery_list(text, int, int, uuid) to anon;
grant execute on function public.gallery_share(uuid, text, text, text, text, text, text) to anon;
grant execute on function public.gallery_use(uuid, uuid) to anon;
grant execute on function public.gallery_report(uuid, uuid) to anon;
grant execute on function public.gallery_unshare(uuid, uuid) to anon;
