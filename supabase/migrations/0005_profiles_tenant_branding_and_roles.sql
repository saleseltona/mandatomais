-- ============================================================================
-- Mandato+ | Migração 0005: Perfil do Usuário, Identidade do Mandato e Equipe
-- ============================================================================
-- 100% não-destrutiva: preserva todos os dados existentes.
-- Separa claramente:
--   - Pessoa (user_profiles)
--   - Organização / Mandato (tenants)
--   - Contato (contacts)
-- ============================================================================

-- 1. Adiciona papel 'viewer' (somente leitura) ao enum tenant_role_enum
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'tenant_role_enum'
      and e.enumlabel = 'viewer'
  ) then
    alter type public.tenant_role_enum add value 'viewer';
  end if;
end $$;

-- 2. Tipo de organização/ambiente
do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_type_enum') then
    create type public.organization_type_enum as enum (
      'mandate',
      'pre_campaign',
      'campaign',
      'other'
    );
  end if;
end $$;

-- 3. Tabela de Perfil Pessoal do Usuário (separada do mandato e de contatos)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  phone text,
  team_role_label text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

-- Política: usuário lê e edita o próprio perfil; colegas do mesmo mandato podem ler nome/foto/função
drop policy if exists "user_profiles_select_own_or_teammate" on public.user_profiles;
create policy "user_profiles_select_own_or_teammate"
on public.user_profiles for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.tenant_members tm_me
    join public.tenant_members tm_other
      on tm_other.tenant_id = tm_me.tenant_id
    where tm_me.user_id = auth.uid()
      and tm_other.user_id = public.user_profiles.user_id
  )
);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
on public.user_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 4. Expansão não-destrutiva de public.tenants (identificação e identidade visual)
alter table public.tenants
  add column if not exists public_display_name text,
  add column if not exists organization_type public.organization_type_enum not null default 'mandate',
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists logo_url text,
  add column if not exists primary_color text not null default '#0B1E36',
  add column if not exists accent_color text not null default '#0E7C55',
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.tenants
  drop constraint if exists chk_tenants_primary_color_hex;
alter table public.tenants
  add constraint chk_tenants_primary_color_hex
  check (primary_color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.tenants
  drop constraint if exists chk_tenants_accent_color_hex;
alter table public.tenants
  add constraint chk_tenants_accent_color_hex
  check (accent_color ~ '^#[0-9A-Fa-f]{6}$');

-- 5. Função auxiliar de verificação de permissão de escrita em contatos (exclui viewer)
create or replace function public.can_edit_tenant_contacts(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin', 'advisor')
  );
$$;

-- Atualiza políticas de escrita em contacts/interests para respeitar papel 'viewer' (somente leitura)
drop policy if exists "contacts_insert_own_tenant" on public.contacts;
create policy "contacts_insert_own_tenant"
on public.contacts for insert
to authenticated
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "contacts_update_own_tenant" on public.contacts;
create policy "contacts_update_own_tenant"
on public.contacts for update
to authenticated
using (public.can_edit_tenant_contacts(tenant_id))
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "interests_manage_own_tenant" on public.interests;
create policy "interests_manage_own_tenant"
on public.interests for all
to authenticated
using (public.can_edit_tenant_contacts(tenant_id))
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "contact_interests_manage_own_tenant" on public.contact_interests;
create policy "contact_interests_manage_own_tenant"
on public.contact_interests for all
to authenticated
using (public.can_edit_tenant_contacts(tenant_id))
with check (public.can_edit_tenant_contacts(tenant_id));

-- 6. Convites de Equipe (sem compartilhamento de senha)
create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null check (char_length(trim(email)) >= 5),
  role public.tenant_role_enum not null default 'advisor',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_tenant_invitations_tenant
  on public.tenant_invitations(tenant_id, created_at desc);

alter table public.tenant_invitations enable row level security;

drop policy if exists "tenant_invitations_select_admin" on public.tenant_invitations;
create policy "tenant_invitations_select_admin"
on public.tenant_invitations for select
to authenticated
using (public.is_tenant_admin(tenant_id));

drop policy if exists "tenant_invitations_manage_admin" on public.tenant_invitations;
create policy "tenant_invitations_manage_admin"
on public.tenant_invitations for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- RPC segura para aceitar convite autenticado com o e-mail convidado
create or replace function public.accept_tenant_invitation(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite record;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select lower(email) into v_user_email
  from auth.users
  where id = v_user_id;

  select * into v_invite
  from public.tenant_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > timezone('utc', now())
  limit 1;

  if not found then
    raise exception 'Convite inválido ou expirado.' using errcode = 'P0005';
  end if;

  if lower(trim(v_invite.email)) <> v_user_email then
    raise exception 'Este convite foi emitido para outro endereço de e-mail.' using errcode = '42501';
  end if;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_invite.tenant_id, v_user_id, v_invite.role)
  on conflict (tenant_id, user_id) do update set role = excluded.role;

  update public.tenant_invitations
  set accepted_at = timezone('utc', now())
  where id = v_invite.id;

  insert into public.audit_logs (
    tenant_id,
    data_scope,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_invite.tenant_id,
    'mandate',
    v_user_id,
    'team.invitation_accepted',
    'tenant_member',
    v_invite.id,
    jsonb_build_object('role', v_invite.role)
  );

  return jsonb_build_object(
    'tenant_id', v_invite.tenant_id,
    'role', v_invite.role
  );
end;
$$;

revoke all on function public.accept_tenant_invitation(uuid) from public;
grant execute on function public.accept_tenant_invitation(uuid) to authenticated;

-- 7. Atualiza bootstrap_first_tenant para suportar onboarding completo (etapas 1 a 3)
create or replace function public.bootstrap_first_tenant(
  p_name text,
  p_slug text,
  p_office_title text default null,
  p_city text default null,
  p_state text default null,
  p_public_display_name text default null,
  p_organization_type public.organization_type_enum default 'mandate',
  p_bio text default null,
  p_primary_color text default '#0B1E36',
  p_accent_color text default '#0E7C55',
  p_logo_url text default null,
  p_avatar_url text default null,
  p_social_links jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_clean_slug text := lower(trim(coalesce(p_slug, '')));
  v_clean_state char(2) := nullif(upper(trim(coalesce(p_state, ''))), '');
  v_now timestamptz := timezone('utc', now());
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.tenant_members where user_id = v_user_id
  ) then
    raise exception 'Este usuário já está vinculado a um mandato.'
      using errcode = 'P0004';
  end if;

  insert into public.tenants (
    name,
    slug,
    office_title,
    city,
    state,
    public_display_name,
    organization_type,
    bio,
    primary_color,
    accent_color,
    logo_url,
    avatar_url,
    social_links,
    onboarding_completed_at
  )
  values (
    trim(p_name),
    v_clean_slug,
    nullif(trim(coalesce(p_office_title, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    v_clean_state,
    nullif(trim(coalesce(p_public_display_name, '')), ''),
    coalesce(p_organization_type, 'mandate'),
    nullif(trim(coalesce(p_bio, '')), ''),
    coalesce(nullif(trim(coalesce(p_primary_color, '')), ''), '#0B1E36'),
    coalesce(nullif(trim(coalesce(p_accent_color, '')), ''), '#0E7C55'),
    nullif(trim(coalesce(p_logo_url, '')), ''),
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    coalesce(p_social_links, '{}'::jsonb),
    v_now
  )
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, v_user_id, 'owner');

  insert into public.audit_logs (
    tenant_id,
    data_scope,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_tenant_id,
    'mandate',
    v_user_id,
    'tenant.created',
    'tenant',
    v_tenant_id,
    jsonb_build_object(
      'name', trim(p_name),
      'slug', v_clean_slug,
      'organization_type', coalesce(p_organization_type, 'mandate')
    )
  );

  return jsonb_build_object('tenant_id', v_tenant_id, 'slug', v_clean_slug);
end;
$$;

revoke all on function public.bootstrap_first_tenant(
  text, text, text, text, text, text, public.organization_type_enum, text, text, text, text, text, jsonb
) from public;
grant execute on function public.bootstrap_first_tenant(
  text, text, text, text, text, text, public.organization_type_enum, text, text, text, text, text, jsonb
) to authenticated;
