-- ============================================================================
-- Mandato+ | Migração 0007: Demandas nos Bairros, Transparência e Storage
-- ============================================================================
-- 100% não-destrutiva e idempotente. RLS habilitado em todas as novas tabelas.
-- ============================================================================

-- 1. Enums para Demandas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'demand_priority_enum') then
    create type public.demand_priority_enum as enum ('baixa', 'media', 'alta');
  end if;

  if not exists (select 1 from pg_type where typname = 'demand_status_enum') then
    create type public.demand_status_enum as enum ('recebida', 'em_execucao', 'resolvida');
  end if;
end $$;

-- 2. Tabela de Demandas nos Bairros
create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  protocol text not null,
  title text not null check (char_length(trim(title)) >= 3),
  description text,
  category text,
  city text not null check (char_length(trim(city)) >= 2),
  neighborhood text,
  priority public.demand_priority_enum not null default 'media',
  status public.demand_status_enum not null default 'recebida',
  contact_id uuid references public.contacts(id) on delete set null,
  requester_name text,
  office_note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, protocol)
);

create index if not exists idx_demands_tenant_scope_status
  on public.demands(tenant_id, data_scope, status, created_at desc);

drop trigger if exists trg_demands_updated_at on public.demands;
create trigger trg_demands_updated_at
before update on public.demands
for each row execute function public.set_updated_at();

alter table public.demands enable row level security;

drop policy if exists "demands_select_own_tenant" on public.demands;
create policy "demands_select_own_tenant"
on public.demands for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "demands_insert_editor" on public.demands;
create policy "demands_insert_editor"
on public.demands for insert
to authenticated
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "demands_update_editor" on public.demands;
create policy "demands_update_editor"
on public.demands for update
to authenticated
using (public.can_edit_tenant_contacts(tenant_id))
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "demands_delete_admin" on public.demands;
create policy "demands_delete_admin"
on public.demands for delete
to authenticated
using (public.is_tenant_admin(tenant_id));

-- 3. Tabela de Ações / Transparência do Mandato
create table if not exists public.mandate_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  title text not null check (char_length(trim(title)) >= 3),
  summary text not null check (char_length(trim(summary)) >= 5),
  category text,
  city text,
  neighborhood text,
  action_date date not null default current_date,
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_mandate_actions_tenant_public
  on public.mandate_actions(tenant_id, is_public, action_date desc);

drop trigger if exists trg_mandate_actions_updated_at on public.mandate_actions;
create trigger trg_mandate_actions_updated_at
before update on public.mandate_actions
for each row execute function public.set_updated_at();

alter table public.mandate_actions enable row level security;

drop policy if exists "mandate_actions_select_own_tenant" on public.mandate_actions;
create policy "mandate_actions_select_own_tenant"
on public.mandate_actions for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "mandate_actions_manage_admin" on public.mandate_actions;
create policy "mandate_actions_manage_admin"
on public.mandate_actions for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- RPC pública para página de transparência do mandato (/transparencia/[slug])
create or replace function public.get_public_transparency_feed(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant record;
  v_actions jsonb;
begin
  select
    id,
    slug,
    coalesce(nullif(trim(public_display_name), ''), name) as display_name,
    office_title,
    city,
    state,
    bio,
    primary_color,
    accent_color,
    logo_url,
    avatar_url
  into v_tenant
  from public.tenants
  where slug = lower(trim(p_slug))
    and is_active = true
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'summary', a.summary,
        'category', a.category,
        'city', a.city,
        'neighborhood', a.neighborhood,
        'action_date', a.action_date
      )
      order by a.action_date desc, a.created_at desc
    ),
    '[]'::jsonb
  )
  into v_actions
  from public.mandate_actions a
  where a.tenant_id = v_tenant.id
    and a.data_scope = 'mandate'
    and a.is_public = true;

  return jsonb_build_object(
    'slug', v_tenant.slug,
    'display_name', v_tenant.display_name,
    'office_title', v_tenant.office_title,
    'city', v_tenant.city,
    'state', v_tenant.state,
    'bio', v_tenant.bio,
    'primary_color', v_tenant.primary_color,
    'accent_color', v_tenant.accent_color,
    'logo_url', v_tenant.logo_url,
    'avatar_url', v_tenant.avatar_url,
    'actions', v_actions
  );
end;
$$;

revoke all on function public.get_public_transparency_feed(text) from public;
grant execute on function public.get_public_transparency_feed(text) to anon, authenticated;

-- 4. Bucket público controlado para avatares e logotipos (Supabase Storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mandato-media',
  'mandato-media',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "mandato_media_public_read" on storage.objects;
create policy "mandato_media_public_read"
on storage.objects for select
to public
using (bucket_id = 'mandato-media');

drop policy if exists "mandato_media_authenticated_upload" on storage.objects;
create policy "mandato_media_authenticated_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'mandato-media'
  and (
    (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
    or (
      (storage.foldername(name))[1] = 'tenants'
      and public.is_tenant_admin(((storage.foldername(name))[2])::uuid)
    )
  )
);

drop policy if exists "mandato_media_authenticated_update" on storage.objects;
create policy "mandato_media_authenticated_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'mandato-media'
  and (
    (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
    or (
      (storage.foldername(name))[1] = 'tenants'
      and public.is_tenant_admin(((storage.foldername(name))[2])::uuid)
    )
  )
);
