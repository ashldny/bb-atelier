-- Bb Atelier theme gallery: shared themes may carry a typeface.
-- Only a font *name* from the extension's built-in catalog is stored (the popup checks it
-- against src/utils/fontCatalog.js); uploaded font files are never shared.

alter table public.gallery_themes
  add column font text check (font is null or font ~ '^[A-Za-z0-9 ]{1,40}$');

-- New signatures: drop the old ones first so PostgREST never sees two overloads.
drop function if exists public.gallery_list(text, int, int, uuid);
drop function if exists public.gallery_share(uuid, text, text, text, text, text, text);

create function public.gallery_list(sort text default 'popular', page_size int default 30, page_offset int default 0, install_id uuid default null)
returns table (id uuid, name text, author text, page_bg text, accent text, navbar text, page_text text, font text, uses int, created_at timestamptz, mine boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.name, t.author, t.page_bg, t.accent, t.navbar, t.page_text, t.font, t.uses, t.created_at,
         install_id is not null and t.owner_hash = public.gallery_hash(install_id)
  from public.gallery_themes t
  where t.reports < 3
  order by case when sort = 'new' then null else t.uses end desc nulls last, t.created_at desc
  limit least(greatest(page_size, 1), 50) offset greatest(page_offset, 0);
$$;

create function public.gallery_share(install_id uuid, theme_name text, author_name text, page_bg text, accent text, navbar text default null, page_text text default null, font text default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  owner_key text := public.gallery_hash(install_id);
  new_id uuid;
begin
  if (select count(*) from public.gallery_themes t where t.owner_hash = owner_key and t.created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate limited' using errcode = 'P0001', hint = 'limit';
  end if;
  insert into public.gallery_themes (name, author, page_bg, accent, navbar, page_text, font, owner_hash)
  values (
    coalesce(public.gallery_clean_text(theme_name, 40), 'Untitled'),
    public.gallery_clean_text(author_name, 30),
    lower(page_bg), lower(accent), lower(navbar), lower(page_text),
    nullif(btrim(font), ''), owner_key
  )
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'already shared' using errcode = 'P0001', hint = 'duplicate';
end;
$$;

revoke execute on function public.gallery_list(text, int, int, uuid) from public, authenticated;
revoke execute on function public.gallery_share(uuid, text, text, text, text, text, text, text) from public, authenticated;
grant execute on function public.gallery_list(text, int, int, uuid) to anon;
grant execute on function public.gallery_share(uuid, text, text, text, text, text, text, text) to anon;
