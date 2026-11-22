-- Mandato+ | Script Consolidado de Migracoes (0001 a 0007)
-- Seguro para executar no SQL Editor do Supabase (idempotente).


-- ==================== 0001_initial_schema.sql ====================
-- ============================================================================
-- Mandato+ | MigraÃ§Ã£o Inicial Multi-tenant, LGPD, Consentimento e Auditoria
-- ============================================================================
-- Regras aplicadas diretamente no banco de dados:
-- 1. Row Level Security (RLS) habilitado em TODAS as tabelas.
-- 2. Isolamento estrito por tenant_id (nenhum mandato acessa dados de outro).
-- 3. SeparaÃ§Ã£o explÃ­cita entre dados de mandato ('mandate') e campanha ('campaign').
-- 4. MinimizaÃ§Ã£o de dados: sem CPF, religiÃ£o, etnia, biometria ou opiniÃ£o polÃ­tica.
-- 5. Registro de origem, data/hora e versÃ£o do consentimento + trilha imutÃ¡vel.
-- 6. Trilha de auditoria (audit_logs) para alteraÃ§Ãµes relevantes.
-- ============================================================================

create extension if not exists pgcrypto;

-- Tipos enumerados
do $$
begin
  if not exists (select 1 from pg_type where typname = 'data_scope_enum') then
    create type public.data_scope_enum as enum ('mandate', 'campaign');
  end if;

  if not exists (select 1 from pg_type where typname = 'tenant_role_enum') then
    create type public.tenant_role_enum as enum ('owner', 'admin', 'advisor');
  end if;

  if not exists (select 1 from pg_type where typname = 'consent_status_enum') then
    create type public.consent_status_enum as enum ('granted', 'revoked');
  end if;

  if not exists (select 1 from pg_type where typname = 'consent_action_enum') then
    create type public.consent_action_enum as enum ('granted', 'revoked');
  end if;
end $$;

-- FunÃ§Ã£o auxiliar para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Tenants (Mandatos / Gabinetes)
-- ----------------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  office_title text,
  city text,
  state char(2),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Membros do Tenant (UsuÃ¡rios autenticados vinculados a um mandato)
-- ----------------------------------------------------------------------------
create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role_enum not null default 'advisor',
  created_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, user_id)
);

create index if not exists idx_tenant_members_user_id on public.tenant_members(user_id);
create index if not exists idx_tenant_members_tenant_id on public.tenant_members(tenant_id);

-- FunÃ§Ãµes auxiliares de autorizaÃ§Ã£o multi-tenant (evitam recursÃ£o em polÃ­ticas RLS)
create or replace function public.is_tenant_member(target_tenant_id uuid)
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
  );
$$;

create or replace function public.is_tenant_admin(target_tenant_id uuid)
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
      and tm.role in ('owner', 'admin')
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. Links PÃºblicos de Cadastro
-- ----------------------------------------------------------------------------
create table if not exists public.public_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) >= 3),
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_public_links_tenant_scope on public.public_links(tenant_id, data_scope);

drop trigger if exists trg_public_links_updated_at on public.public_links;
create trigger trg_public_links_updated_at
before update on public.public_links
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Contatos / Apoiadores (MinimizaÃ§Ã£o LGPD)
-- ----------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  full_name text not null check (char_length(trim(full_name)) >= 2),
  whatsapp text,
  email text,
  city text not null check (char_length(trim(city)) >= 2),
  neighborhood text,
  birth_day smallint check (birth_day is null or (birth_day between 1 and 31)),
  birth_month smallint check (birth_month is null or (birth_month between 1 and 12)),
  consent_status public.consent_status_enum not null default 'granted',
  consent_source text not null check (char_length(trim(consent_source)) >= 2),
  consent_version text not null check (char_length(trim(consent_version)) >= 1),
  consented_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_contact_channel check (whatsapp is not null or email is not null),
  constraint chk_birthday_pair check (
    (birth_day is null and birth_month is null)
    or (birth_day is not null and birth_month is not null)
  )
);

create index if not exists idx_contacts_tenant_scope on public.contacts(tenant_id, data_scope);
create index if not exists idx_contacts_city_neighborhood on public.contacts(tenant_id, city, neighborhood);
create index if not exists idx_contacts_birthday on public.contacts(tenant_id, birth_month, birth_day)
  where consent_status = 'granted';

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Interesses / Temas (por tenant e escopo)
-- ----------------------------------------------------------------------------
create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  name text not null check (char_length(trim(name)) >= 2),
  created_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, data_scope, name)
);

create table if not exists public.contact_interests (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (contact_id, interest_id)
);

create index if not exists idx_contact_interests_tenant on public.contact_interests(tenant_id, interest_id);

-- ----------------------------------------------------------------------------
-- 6. HistÃ³rico ImutÃ¡vel de Consentimento (LGPD)
-- ----------------------------------------------------------------------------
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  contact_id uuid not null references public.contacts(id) on delete cascade,
  action public.consent_action_enum not null,
  source text not null check (char_length(trim(source)) >= 2),
  consent_version text not null check (char_length(trim(consent_version)) >= 1),
  consent_text_snapshot text not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  ip_hash text,
  user_agent text
);

create index if not exists idx_consent_records_tenant_contact on public.consent_records(tenant_id, contact_id, recorded_at desc);

-- ----------------------------------------------------------------------------
-- 7. Logs de Auditoria (ImutÃ¡vel)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_logs_tenant_created on public.audit_logs(tenant_id, created_at desc);

-- ============================================================================
-- HABILITAÃ‡ÃƒO DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ============================================================================
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.public_links enable row level security;
alter table public.contacts enable row level security;
alter table public.interests enable row level security;
alter table public.contact_interests enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_logs enable row level security;

-- PolÃ­ticas: tenants
drop policy if exists "tenants_select_own" on public.tenants;
create policy "tenants_select_own"
on public.tenants for select
to authenticated
using (public.is_tenant_member(id));

drop policy if exists "tenants_update_admin" on public.tenants;
create policy "tenants_update_admin"
on public.tenants for update
to authenticated
using (public.is_tenant_admin(id))
with check (public.is_tenant_admin(id));

-- PolÃ­ticas: tenant_members
drop policy if exists "tenant_members_select_own_tenant" on public.tenant_members;
create policy "tenant_members_select_own_tenant"
on public.tenant_members for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_members_manage_admin" on public.tenant_members;
create policy "tenant_members_manage_admin"
on public.tenant_members for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- PolÃ­ticas: public_links
drop policy if exists "public_links_select_own_tenant" on public.public_links;
create policy "public_links_select_own_tenant"
on public.public_links for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "public_links_select_active_public" on public.public_links;
create policy "public_links_select_active_public"
on public.public_links for select
to anon
using (is_active = true);

drop policy if exists "public_links_manage_admin" on public.public_links;
create policy "public_links_manage_admin"
on public.public_links for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- PolÃ­ticas: contacts (isolamento estrito por tenant_id)
drop policy if exists "contacts_select_own_tenant" on public.contacts;
create policy "contacts_select_own_tenant"
on public.contacts for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "contacts_insert_own_tenant" on public.contacts;
create policy "contacts_insert_own_tenant"
on public.contacts for insert
to authenticated
with check (public.is_tenant_member(tenant_id));

drop policy if exists "contacts_update_own_tenant" on public.contacts;
create policy "contacts_update_own_tenant"
on public.contacts for update
to authenticated
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

drop policy if exists "contacts_delete_admin_only" on public.contacts;
create policy "contacts_delete_admin_only"
on public.contacts for delete
to authenticated
using (public.is_tenant_admin(tenant_id));

-- PolÃ­ticas: interests
drop policy if exists "interests_select_own_tenant" on public.interests;
create policy "interests_select_own_tenant"
on public.interests for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "interests_manage_own_tenant" on public.interests;
create policy "interests_manage_own_tenant"
on public.interests for all
to authenticated
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

-- PolÃ­ticas: contact_interests
drop policy if exists "contact_interests_select_own_tenant" on public.contact_interests;
create policy "contact_interests_select_own_tenant"
on public.contact_interests for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "contact_interests_manage_own_tenant" on public.contact_interests;
create policy "contact_interests_manage_own_tenant"
on public.contact_interests for all
to authenticated
using (public.is_tenant_member(tenant_id))
with check (public.is_tenant_member(tenant_id));

-- PolÃ­ticas: consent_records (append-only para membros do tenant)
drop policy if exists "consent_records_select_own_tenant" on public.consent_records;
create policy "consent_records_select_own_tenant"
on public.consent_records for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "consent_records_insert_own_tenant" on public.consent_records;
create policy "consent_records_insert_own_tenant"
on public.consent_records for insert
to authenticated
with check (public.is_tenant_member(tenant_id));

-- PolÃ­ticas: audit_logs (append-only para membros do tenant)
drop policy if exists "audit_logs_select_own_tenant" on public.audit_logs;
create policy "audit_logs_select_own_tenant"
on public.audit_logs for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "audit_logs_insert_own_tenant" on public.audit_logs;
create policy "audit_logs_insert_own_tenant"
on public.audit_logs for insert
to authenticated
with check (public.is_tenant_member(tenant_id));


-- ==================== 0002_public_consent_rpcs.sql ====================
-- ============================================================================
-- Mandato+ | MigraÃ§Ã£o 0002: RPCs Seguras para Cadastro PÃºblico e Descadastro
-- ============================================================================
-- MantÃ©m RLS estritamente fechado para o papel `anon` nas tabelas sensÃ­veis
-- (`contacts`, `consent_records`, `audit_logs`, `contact_interests`),
-- expondo apenas operaÃ§Ãµes controladas, validadas e auditadas via RPC.
-- ============================================================================

-- 1. Consulta metadados pÃºblicos de um link ativo de cadastro (sem expor contatos)
create or replace function public.get_public_registration_link(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_interests jsonb;
begin
  select
    pl.id,
    pl.slug,
    pl.title,
    pl.description,
    pl.data_scope,
    pl.tenant_id,
    t.name as tenant_name,
    t.office_title,
    t.city as tenant_city,
    t.state as tenant_state
  into v_link
  from public.public_links pl
  inner join public.tenants t on t.id = pl.tenant_id
  where pl.slug = lower(trim(p_slug))
    and pl.is_active = true
    and t.is_active = true
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', i.id, 'name', i.name)
      order by i.name asc
    ),
    '[]'::jsonb
  )
  into v_interests
  from public.interests i
  where i.tenant_id = v_link.tenant_id
    and i.data_scope = v_link.data_scope;

  return jsonb_build_object(
    'id', v_link.id,
    'slug', v_link.slug,
    'title', v_link.title,
    'description', v_link.description,
    'data_scope', v_link.data_scope,
    'tenant_name', v_link.tenant_name,
    'office_title', v_link.office_title,
    'tenant_city', v_link.tenant_city,
    'tenant_state', v_link.tenant_state,
    'interests', v_interests
  );
end;
$$;

-- 2. Registra apoiador via link pÃºblico com consentimento explÃ­cito obrigatÃ³rio
create or replace function public.register_public_supporter(
  p_slug text,
  p_full_name text,
  p_whatsapp text,
  p_email text,
  p_city text,
  p_neighborhood text,
  p_birth_day smallint,
  p_birth_month smallint,
  p_interest_ids uuid[],
  p_consent_accepted boolean,
  p_consent_source text,
  p_consent_version text,
  p_consent_text_snapshot text,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_contact_id uuid;
  v_unsubscribe_token uuid;
  v_clean_whatsapp text;
  v_clean_email text;
  v_now timestamptz := timezone('utc', now());
begin
  if p_consent_accepted is not true then
    raise exception 'Consentimento explÃ­cito Ã© obrigatÃ³rio para concluir o cadastro.'
      using errcode = 'P0001';
  end if;

  select
    pl.id,
    pl.tenant_id,
    pl.data_scope,
    pl.slug
  into v_link
  from public.public_links pl
  inner join public.tenants t on t.id = pl.tenant_id
  where pl.slug = lower(trim(p_slug))
    and pl.is_active = true
    and t.is_active = true
  limit 1;

  if not found then
    raise exception 'Link pÃºblico de cadastro invÃ¡lido ou inativo.'
      using errcode = 'P0002';
  end if;

  v_clean_whatsapp := nullif(regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g'), '');
  v_clean_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  if v_clean_whatsapp is null and v_clean_email is null then
    raise exception 'Informe ao menos um canal de contato (WhatsApp ou e-mail).'
      using errcode = 'P0003';
  end if;

  insert into public.contacts (
    tenant_id,
    data_scope,
    full_name,
    whatsapp,
    email,
    city,
    neighborhood,
    birth_day,
    birth_month,
    consent_status,
    consent_source,
    consent_version,
    consented_at
  )
  values (
    v_link.tenant_id,
    v_link.data_scope,
    trim(p_full_name),
    v_clean_whatsapp,
    v_clean_email,
    trim(p_city),
    nullif(trim(coalesce(p_neighborhood, '')), ''),
    p_birth_day,
    p_birth_month,
    'granted',
    trim(p_consent_source),
    trim(p_consent_version),
    v_now
  )
  returning id, unsubscribe_token
  into v_contact_id, v_unsubscribe_token;

  -- Associa apenas interesses que pertencem ao mesmo tenant_id e data_scope
  if p_interest_ids is not null and array_length(p_interest_ids, 1) > 0 then
    insert into public.contact_interests (tenant_id, contact_id, interest_id)
    select
      v_link.tenant_id,
      v_contact_id,
      i.id
    from public.interests i
    where i.id = any(p_interest_ids)
      and i.tenant_id = v_link.tenant_id
      and i.data_scope = v_link.data_scope
    on conflict do nothing;
  end if;

  -- Trilha imutÃ¡vel de consentimento
  insert into public.consent_records (
    tenant_id,
    data_scope,
    contact_id,
    action,
    source,
    consent_version,
    consent_text_snapshot,
    recorded_at,
    ip_hash,
    user_agent
  )
  values (
    v_link.tenant_id,
    v_link.data_scope,
    v_contact_id,
    'granted',
    trim(p_consent_source),
    trim(p_consent_version),
    p_consent_text_snapshot,
    v_now,
    p_ip_hash,
    p_user_agent
  );

  -- Log de auditoria
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
    v_link.tenant_id,
    v_link.data_scope,
    null,
    'contact.public_registered',
    'contact',
    v_contact_id,
    jsonb_build_object(
      'public_link_slug', v_link.slug,
      'consent_source', trim(p_consent_source),
      'consent_version', trim(p_consent_version)
    )
  );

  return jsonb_build_object(
    'contact_id', v_contact_id,
    'unsubscribe_token', v_unsubscribe_token,
    'consented_at', v_now
  );
end;
$$;

-- 3. PrÃ©via segura para pÃ¡gina de descadastro por token Ãºnico
create or replace function public.get_unsubscribe_preview(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
begin
  select
    c.consent_status,
    c.data_scope,
    c.revoked_at,
    split_part(trim(c.full_name), ' ', 1) as first_name,
    t.name as tenant_name,
    t.office_title
  into v_record
  from public.contacts c
  inner join public.tenants t on t.id = c.tenant_id
  where c.unsubscribe_token = p_token
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'first_name', v_record.first_name,
    'tenant_name', v_record.tenant_name,
    'office_title', v_record.office_title,
    'data_scope', v_record.data_scope,
    'consent_status', v_record.consent_status,
    'revoked_at', v_record.revoked_at
  );
end;
$$;

-- 4. Revoga consentimento via token de descadastro fÃ¡cil (idempotente e auditado)
create or replace function public.revoke_supporter_consent(
  p_token uuid,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact record;
  v_now timestamptz := timezone('utc', now());
begin
  select
    id,
    tenant_id,
    data_scope,
    consent_status,
    consent_version,
    revoked_at
  into v_contact
  from public.contacts
  where unsubscribe_token = p_token
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  if v_contact.consent_status = 'revoked' then
    return jsonb_build_object(
      'found', true,
      'already_revoked', true,
      'revoked_at', v_contact.revoked_at
    );
  end if;

  update public.contacts
  set
    consent_status = 'revoked',
    revoked_at = v_now
  where id = v_contact.id;

  insert into public.consent_records (
    tenant_id,
    data_scope,
    contact_id,
    action,
    source,
    consent_version,
    consent_text_snapshot,
    recorded_at,
    ip_hash,
    user_agent
  )
  values (
    v_contact.tenant_id,
    v_contact.data_scope,
    v_contact.id,
    'revoked',
    'link-descadastro',
    v_contact.consent_version,
    'Consentimento revogado pelo titular atravÃ©s do link pÃºblico de descadastro.',
    v_now,
    p_ip_hash,
    p_user_agent
  );

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
    v_contact.tenant_id,
    v_contact.data_scope,
    null,
    'contact.consent_revoked',
    'contact',
    v_contact.id,
    jsonb_build_object('source', 'link-descadastro')
  );

  return jsonb_build_object(
    'found', true,
    'already_revoked', false,
    'revoked_at', v_now
  );
end;
$$;

-- PermissÃµes de execuÃ§Ã£o controladas
revoke all on function public.get_public_registration_link(text) from public;
grant execute on function public.get_public_registration_link(text) to anon, authenticated;

revoke all on function public.register_public_supporter(
  text, text, text, text, text, text, smallint, smallint, uuid[], boolean, text, text, text, text, text
) from public;
grant execute on function public.register_public_supporter(
  text, text, text, text, text, text, smallint, smallint, uuid[], boolean, text, text, text, text, text
) to anon, authenticated;

revoke all on function public.get_unsubscribe_preview(uuid) from public;
grant execute on function public.get_unsubscribe_preview(uuid) to anon, authenticated;

revoke all on function public.revoke_supporter_consent(uuid, text, text) from public;
grant execute on function public.revoke_supporter_consent(uuid, text, text) to anon, authenticated;


-- ==================== 0003_security_hardening_and_onboarding.sql ====================
-- ============================================================================
-- Mandato+ | MigraÃ§Ã£o 0003: Hardening de SeguranÃ§a, DeduplicaÃ§Ã£o e Onboarding
-- ============================================================================
-- 1. Remove polÃ­tica RLS pÃºblica `public_links_select_active_public` (evita
--    enumeraÃ§Ã£o de tenants/links por `anon`; acesso pÃºblico segue via RPC).
-- 2. ValidaÃ§Ã£o de calendÃ¡rio real para dia/mÃªs de aniversÃ¡rio.
-- 3. Integridade de tenant_id e data_scope em `contact_interests`.
-- 4. DeduplicaÃ§Ã£o segura em `register_public_supporter` (reconsentimento
--    auditado sem duplicar contatos no mesmo tenant/escopo).
-- 5. RPC segura `bootstrap_first_tenant` para onboarding self-service.
-- ============================================================================

-- 1. Fecha exposiÃ§Ã£o direta da tabela public_links para o papel anon
drop policy if exists "public_links_select_active_public" on public.public_links;

-- 2. Constraint de calendÃ¡rio real para aniversÃ¡rio (sem exigir ano)
alter table public.contacts
  drop constraint if exists chk_valid_birthday_calendar;

alter table public.contacts
  add constraint chk_valid_birthday_calendar check (
    birth_day is null
    or (
      (birth_month in (1, 3, 5, 7, 8, 10, 12) and birth_day between 1 and 31)
      or (birth_month in (4, 6, 9, 11) and birth_day between 1 and 30)
      or (birth_month = 2 and birth_day between 1 and 29)
    )
  );

-- Ãndices para buscas rÃ¡pidas de deduplicaÃ§Ã£o por tenant e escopo
create index if not exists idx_contacts_tenant_scope_whatsapp
  on public.contacts(tenant_id, data_scope, whatsapp)
  where whatsapp is not null;

create index if not exists idx_contacts_tenant_scope_email
  on public.contacts(tenant_id, data_scope, email)
  where email is not null;

-- 3. Trigger de integridade para contact_interests (mesmo tenant_id e data_scope)
create or replace function public.enforce_contact_interest_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact record;
  v_interest record;
begin
  select tenant_id, data_scope into v_contact
  from public.contacts
  where id = new.contact_id;

  select tenant_id, data_scope into v_interest
  from public.interests
  where id = new.interest_id;

  if not found or v_contact.tenant_id is null then
    raise exception 'Contato ou interesse inexistente.'
      using errcode = '23503';
  end if;

  if v_contact.tenant_id <> new.tenant_id
     or v_interest.tenant_id <> new.tenant_id
     or v_contact.data_scope <> v_interest.data_scope then
    raise exception 'Contato e interesse devem pertencer ao mesmo mandato e escopo.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_contact_interests_scope on public.contact_interests;
create trigger trg_contact_interests_scope
before insert or update on public.contact_interests
for each row execute function public.enforce_contact_interest_scope();

-- 4. Atualiza register_public_supporter com deduplicaÃ§Ã£o e reconsentimento auditado
create or replace function public.register_public_supporter(
  p_slug text,
  p_full_name text,
  p_whatsapp text,
  p_email text,
  p_city text,
  p_neighborhood text,
  p_birth_day smallint,
  p_birth_month smallint,
  p_interest_ids uuid[],
  p_consent_accepted boolean,
  p_consent_source text,
  p_consent_version text,
  p_consent_text_snapshot text,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_existing record;
  v_contact_id uuid;
  v_unsubscribe_token uuid;
  v_clean_whatsapp text;
  v_clean_email text;
  v_now timestamptz := timezone('utc', now());
  v_action_name text := 'contact.public_registered';
begin
  if p_consent_accepted is not true then
    raise exception 'Consentimento explÃ­cito Ã© obrigatÃ³rio para concluir o cadastro.'
      using errcode = 'P0001';
  end if;

  select
    pl.id,
    pl.tenant_id,
    pl.data_scope,
    pl.slug
  into v_link
  from public.public_links pl
  inner join public.tenants t on t.id = pl.tenant_id
  where pl.slug = lower(trim(p_slug))
    and pl.is_active = true
    and t.is_active = true
  limit 1;

  if not found then
    raise exception 'Link pÃºblico de cadastro invÃ¡lido ou inativo.'
      using errcode = 'P0002';
  end if;

  v_clean_whatsapp := nullif(regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g'), '');
  v_clean_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  if v_clean_whatsapp is null and v_clean_email is null then
    raise exception 'Informe ao menos um canal de contato (WhatsApp ou e-mail).'
      using errcode = 'P0003';
  end if;

  -- Verifica se jÃ¡ existe contato com mesmo WhatsApp ou e-mail no mesmo tenant/escopo
  select id, unsubscribe_token
  into v_existing
  from public.contacts
  where tenant_id = v_link.tenant_id
    and data_scope = v_link.data_scope
    and (
      (v_clean_whatsapp is not null and whatsapp = v_clean_whatsapp)
      or (v_clean_email is not null and email = v_clean_email)
    )
  order by created_at asc
  limit 1;

  if found then
    v_contact_id := v_existing.id;
    v_unsubscribe_token := v_existing.unsubscribe_token;
    v_action_name := 'contact.public_reconsented';

    update public.contacts
    set
      full_name = trim(p_full_name),
      whatsapp = coalesce(v_clean_whatsapp, whatsapp),
      email = coalesce(v_clean_email, email),
      city = trim(p_city),
      neighborhood = coalesce(nullif(trim(coalesce(p_neighborhood, '')), ''), neighborhood),
      birth_day = coalesce(p_birth_day, birth_day),
      birth_month = coalesce(p_birth_month, birth_month),
      consent_status = 'granted',
      consent_source = trim(p_consent_source),
      consent_version = trim(p_consent_version),
      consented_at = v_now,
      revoked_at = null
    where id = v_contact_id;
  else
    insert into public.contacts (
      tenant_id,
      data_scope,
      full_name,
      whatsapp,
      email,
      city,
      neighborhood,
      birth_day,
      birth_month,
      consent_status,
      consent_source,
      consent_version,
      consented_at
    )
    values (
      v_link.tenant_id,
      v_link.data_scope,
      trim(p_full_name),
      v_clean_whatsapp,
      v_clean_email,
      trim(p_city),
      nullif(trim(coalesce(p_neighborhood, '')), ''),
      p_birth_day,
      p_birth_month,
      'granted',
      trim(p_consent_source),
      trim(p_consent_version),
      v_now
    )
    returning id, unsubscribe_token
    into v_contact_id, v_unsubscribe_token;
  end if;

  if p_interest_ids is not null and array_length(p_interest_ids, 1) > 0 then
    insert into public.contact_interests (tenant_id, contact_id, interest_id)
    select
      v_link.tenant_id,
      v_contact_id,
      i.id
    from public.interests i
    where i.id = any(p_interest_ids)
      and i.tenant_id = v_link.tenant_id
      and i.data_scope = v_link.data_scope
    on conflict do nothing;
  end if;

  insert into public.consent_records (
    tenant_id,
    data_scope,
    contact_id,
    action,
    source,
    consent_version,
    consent_text_snapshot,
    recorded_at,
    ip_hash,
    user_agent
  )
  values (
    v_link.tenant_id,
    v_link.data_scope,
    v_contact_id,
    'granted',
    trim(p_consent_source),
    trim(p_consent_version),
    p_consent_text_snapshot,
    v_now,
    p_ip_hash,
    p_user_agent
  );

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
    v_link.tenant_id,
    v_link.data_scope,
    null,
    v_action_name,
    'contact',
    v_contact_id,
    jsonb_build_object(
      'public_link_slug', v_link.slug,
      'consent_source', trim(p_consent_source),
      'consent_version', trim(p_consent_version)
    )
  );

  return jsonb_build_object(
    'contact_id', v_contact_id,
    'unsubscribe_token', v_unsubscribe_token,
    'consented_at', v_now,
    'reconsented', (v_action_name = 'contact.public_reconsented')
  );
end;
$$;

-- 5. RPC segura para onboarding do primeiro mandato pelo usuÃ¡rio autenticado
create or replace function public.bootstrap_first_tenant(
  p_name text,
  p_slug text,
  p_office_title text default null,
  p_city text default null,
  p_state text default null
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
begin
  if v_user_id is null then
    raise exception 'UsuÃ¡rio nÃ£o autenticado.'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.tenant_members where user_id = v_user_id
  ) then
    raise exception 'Este usuÃ¡rio jÃ¡ estÃ¡ vinculado a um mandato.'
      using errcode = 'P0004';
  end if;

  insert into public.tenants (name, slug, office_title, city, state)
  values (
    trim(p_name),
    v_clean_slug,
    nullif(trim(coalesce(p_office_title, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    v_clean_state
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
    jsonb_build_object('name', trim(p_name), 'slug', v_clean_slug)
  );

  return jsonb_build_object('tenant_id', v_tenant_id, 'slug', v_clean_slug);
end;
$$;

revoke all on function public.bootstrap_first_tenant(text, text, text, text, text) from public;
grant execute on function public.bootstrap_first_tenant(text, text, text, text, text) to authenticated;


-- ==================== 0004_geo_summary_rpc.sql ====================
-- ============================================================================
-- Mandato+ | MigraÃ§Ã£o 0004: AgregaÃ§Ã£o SQL de Cidades e Bairros (Escalabilidade)
-- ============================================================================
-- Evita trafegar todas as linhas de `contacts` para o servidor Node.js ao
-- montar filtros de cidade e bairro na base paginada.
-- Valida obrigatoriamente `public.is_tenant_member(p_tenant_id)`.
-- ============================================================================

create or replace function public.get_scope_geo_summary(
  p_tenant_id uuid,
  p_data_scope public.data_scope_enum,
  p_selected_city text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cities jsonb;
  v_neighborhoods jsonb;
begin
  if not public.is_tenant_member(p_tenant_id) then
    raise exception 'Acesso negado ao mandato solicitado.'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('city', city_name, 'count', total_count)
      order by total_count desc, city_name asc
    ),
    '[]'::jsonb
  )
  into v_cities
  from (
    select
      c.city as city_name,
      count(*)::int as total_count
    from public.contacts c
    where c.tenant_id = p_tenant_id
      and c.data_scope = p_data_scope
      and c.city is not null
      and trim(c.city) <> ''
    group by c.city
  ) grouped_cities;

  select coalesce(
    jsonb_agg(neighborhood_name order by neighborhood_name asc),
    '[]'::jsonb
  )
  into v_neighborhoods
  from (
    select distinct c.neighborhood as neighborhood_name
    from public.contacts c
    where c.tenant_id = p_tenant_id
      and c.data_scope = p_data_scope
      and c.neighborhood is not null
      and trim(c.neighborhood) <> ''
      and (
        p_selected_city is null
        or trim(p_selected_city) = ''
        or c.city = trim(p_selected_city)
      )
  ) distinct_neighborhoods;

  return jsonb_build_object(
    'cities', v_cities,
    'neighborhoods', v_neighborhoods
  );
end;
$$;

revoke all on function public.get_scope_geo_summary(uuid, public.data_scope_enum, text) from public;
grant execute on function public.get_scope_geo_summary(uuid, public.data_scope_enum, text) to authenticated;


-- ==================== 0005_profiles_tenant_branding_and_roles.sql ====================
-- ============================================================================
-- Mandato+ | MigraÃ§Ã£o 0005: Perfil do UsuÃ¡rio, Identidade do Mandato e Equipe
-- ============================================================================
-- 100% nÃ£o-destrutiva: preserva todos os dados existentes.
-- Separa claramente:
--   - Pessoa (user_profiles)
--   - OrganizaÃ§Ã£o / Mandato (tenants)
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

-- 2. Tipo de organizaÃ§Ã£o/ambiente
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

-- 3. Tabela de Perfil Pessoal do UsuÃ¡rio (separada do mandato e de contatos)
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

-- PolÃ­tica: usuÃ¡rio lÃª e edita o prÃ³prio perfil; colegas do mesmo mandato podem ler nome/foto/funÃ§Ã£o
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

-- 4. ExpansÃ£o nÃ£o-destrutiva de public.tenants (identificaÃ§Ã£o e identidade visual)
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

-- 5. FunÃ§Ã£o auxiliar de verificaÃ§Ã£o de permissÃ£o de escrita em contatos (exclui viewer)
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

-- Atualiza polÃ­ticas de escrita em contacts/interests para respeitar papel 'viewer' (somente leitura)
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
    raise exception 'UsuÃ¡rio nÃ£o autenticado.' using errcode = '42501';
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
    raise exception 'Convite invÃ¡lido ou expirado.' using errcode = 'P0005';
  end if;

  if lower(trim(v_invite.email)) <> v_user_email then
    raise exception 'Este convite foi emitido para outro endereÃ§o de e-mail.' using errcode = '42501';
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
    raise exception 'UsuÃ¡rio nÃ£o autenticado.'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.tenant_members where user_id = v_user_id
  ) then
    raise exception 'Este usuÃ¡rio jÃ¡ estÃ¡ vinculado a um mandato.'
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


-- ==================== 0006_contacts_instagram_imports_and_reconciliation.sql ====================
-- ============================================================================
-- Mandato+ | MigraÃ§Ã£o 0006: @Instagram, ImportaÃ§Ã£o, ConciliaÃ§Ã£o e IntegraÃ§Ãµes
-- ============================================================================
-- Regras aplicadas diretamente no banco:
-- 1. Contatos importados NUNCA recebem consent_status = 'granted' automaticamente
--    e usam consent_status = 'pending' (sem autorizaÃ§Ã£o de envio).
-- 2. Categorias distintas: supporter | registered_contact | imported_record.
-- 3. Data da importaÃ§Ã£o nunca sobrescreve consented_at nem original_registered_at.
-- 4. Mesclagens preservam snapshot_before para permitir desfazer com auditoria.
-- 5. RLS em 100% das novas tabelas.
-- ============================================================================

-- 1. Adiciona 'pending' ao enum consent_status_enum
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'consent_status_enum'
      and e.enumlabel = 'pending'
  ) then
    alter type public.consent_status_enum add value 'pending';
  end if;
end $$;

-- 2. Categoria distinta de contato (nÃ£o misturar apoiador declarado com importado)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'contact_category_enum') then
    create type public.contact_category_enum as enum (
      'supporter',
      'registered_contact',
      'imported_record'
    );
  end if;
end $$;

-- 3. Lotes de importaÃ§Ã£o (rastreabilidade e retenÃ§Ã£o controlada â€” sem arquivo bruto)
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  imported_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  declared_origin text not null check (char_length(trim(declared_origin)) >= 2),
  declared_purpose text not null check (char_length(trim(declared_purpose)) >= 3),
  legal_basis text not null default 'revisao_pendente',
  total_rows integer not null default 0,
  imported_count integer not null default 0,
  merged_count integer not null default 0,
  pending_review_count integer not null default 0,
  rejected_count integer not null default 0,
  status text not null default 'completed' check (status in ('processing', 'completed', 'deleted')),
  retention_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_import_batches_tenant
  on public.import_batches(tenant_id, data_scope, created_at desc);

-- 4. ExpansÃ£o nÃ£o-destrutiva de public.contacts
alter table public.contacts
  add column if not exists instagram_handle text,
  add column if not exists instagram_handle_normalized text,
  add column if not exists contact_category public.contact_category_enum not null default 'supporter',
  add column if not exists original_registered_at timestamptz,
  add column if not exists import_batch_id uuid references public.import_batches(id) on delete set null;

-- Permite que registros importados de arquivo (ex.: exportaÃ§Ã£o do Instagram) tenham apenas @Instagram sem telefone/e-mail
alter table public.contacts
  drop constraint if exists chk_contact_channel;
alter table public.contacts
  add constraint chk_contact_channel
  check (
    whatsapp is not null
    or email is not null
    or instagram_handle_normalized is not null
  );

-- Permite consented_at nulo para registros importados sem consentimento validado
alter table public.contacts
  alter column consented_at drop not null;

create index if not exists idx_contacts_tenant_scope_instagram
  on public.contacts(tenant_id, data_scope, instagram_handle_normalized)
  where instagram_handle_normalized is not null;

-- 5. Linhas de revisÃ£o e conciliaÃ§Ã£o de importaÃ§Ã£o
create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  row_number integer not null,
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  match_type text not null default 'no_match'
    check (match_type in ('exact_instagram', 'exact_email', 'exact_phone', 'possible_duplicate', 'no_match')),
  matched_contact_id uuid references public.contacts(id) on delete set null,
  match_fields text[] not null default '{}'::text[],
  resolution text not null default 'pending'
    check (resolution in ('pending', 'created', 'merged', 'rejected', 'ignored')),
  error_message text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_import_rows_batch on public.import_rows(batch_id, resolution);
create index if not exists idx_import_rows_tenant_pending
  on public.import_rows(tenant_id, data_scope, resolution)
  where resolution = 'pending';

-- 6. HistÃ³rico de mesclagens com snapshot para desfazer (undo)
create table if not exists public.contact_merges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  target_contact_id uuid not null references public.contacts(id) on delete cascade,
  import_row_id uuid references public.import_rows(id) on delete set null,
  match_fields text[] not null default '{}'::text[],
  snapshot_before jsonb not null,
  merged_fields jsonb not null default '{}'::jsonb,
  merged_by uuid references auth.users(id) on delete set null,
  merged_at timestamptz not null default timezone('utc', now()),
  undone_at timestamptz,
  undone_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_contact_merges_tenant
  on public.contact_merges(tenant_id, data_scope, merged_at desc);

-- 7. IntegraÃ§Ãµes oficiais por mandato (ex.: Meta / Instagram oficial)
create table if not exists public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('instagram_official')),
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'pending_config')),
  external_account_id text,
  account_handle text,
  granted_scopes text[] not null default '{}'::text[],
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  disconnected_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, provider)
);

-- ============================================================================
-- RLS EM TODAS AS NOVAS TABELAS
-- ============================================================================
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.contact_merges enable row level security;
alter table public.tenant_integrations enable row level security;

drop policy if exists "import_batches_select_admin" on public.import_batches;
create policy "import_batches_select_admin"
on public.import_batches for select
to authenticated
using (public.is_tenant_admin(tenant_id));

drop policy if exists "import_batches_manage_admin" on public.import_batches;
create policy "import_batches_manage_admin"
on public.import_batches for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

drop policy if exists "import_rows_select_admin" on public.import_rows;
create policy "import_rows_select_admin"
on public.import_rows for select
to authenticated
using (public.is_tenant_admin(tenant_id));

drop policy if exists "import_rows_manage_admin" on public.import_rows;
create policy "import_rows_manage_admin"
on public.import_rows for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

drop policy if exists "contact_merges_select_admin" on public.contact_merges;
create policy "contact_merges_select_admin"
on public.contact_merges for select
to authenticated
using (public.is_tenant_admin(tenant_id));

drop policy if exists "contact_merges_manage_admin" on public.contact_merges;
create policy "contact_merges_manage_admin"
on public.contact_merges for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

drop policy if exists "tenant_integrations_select_member" on public.tenant_integrations;
create policy "tenant_integrations_select_member"
on public.tenant_integrations for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_integrations_manage_admin" on public.tenant_integrations;
create policy "tenant_integrations_manage_admin"
on public.tenant_integrations for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- ============================================================================
-- ATUALIZA RPCs PÃšBLICAS PARA IDENTIDADE VISUAL E @INSTAGRAM OPCIONAL
-- ============================================================================
create or replace function public.get_public_registration_link(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_interests jsonb;
begin
  select
    pl.id,
    pl.slug,
    pl.title,
    pl.description,
    pl.data_scope,
    pl.tenant_id,
    coalesce(nullif(trim(t.public_display_name), ''), t.name) as tenant_name,
    t.office_title,
    t.city as tenant_city,
    t.state as tenant_state,
    t.primary_color,
    t.accent_color,
    t.logo_url,
    t.avatar_url
  into v_link
  from public.public_links pl
  inner join public.tenants t on t.id = pl.tenant_id
  where pl.slug = lower(trim(p_slug))
    and pl.is_active = true
    and t.is_active = true
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', i.id, 'name', i.name)
      order by i.name asc
    ),
    '[]'::jsonb
  )
  into v_interests
  from public.interests i
  where i.tenant_id = v_link.tenant_id
    and i.data_scope = v_link.data_scope;

  return jsonb_build_object(
    'id', v_link.id,
    'slug', v_link.slug,
    'title', v_link.title,
    'description', v_link.description,
    'data_scope', v_link.data_scope,
    'tenant_name', v_link.tenant_name,
    'office_title', v_link.office_title,
    'tenant_city', v_link.tenant_city,
    'tenant_state', v_link.tenant_state,
    'primary_color', v_link.primary_color,
    'accent_color', v_link.accent_color,
    'logo_url', v_link.logo_url,
    'avatar_url', v_link.avatar_url,
    'interests', v_interests
  );
end;
$$;

create or replace function public.register_public_supporter(
  p_slug text,
  p_full_name text,
  p_whatsapp text,
  p_email text,
  p_city text,
  p_neighborhood text,
  p_birth_day smallint,
  p_birth_month smallint,
  p_interest_ids uuid[],
  p_consent_accepted boolean,
  p_consent_source text,
  p_consent_version text,
  p_consent_text_snapshot text,
  p_ip_hash text default null,
  p_user_agent text default null,
  p_instagram_handle text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_existing record;
  v_contact_id uuid;
  v_unsubscribe_token uuid;
  v_clean_whatsapp text;
  v_clean_email text;
  v_raw_instagram text;
  v_norm_instagram text;
  v_now timestamptz := timezone('utc', now());
  v_action_name text := 'contact.public_registered';
begin
  if p_consent_accepted is not true then
    raise exception 'Consentimento explÃ­cito Ã© obrigatÃ³rio para concluir o cadastro.'
      using errcode = 'P0001';
  end if;

  select
    pl.id,
    pl.tenant_id,
    pl.data_scope,
    pl.slug
  into v_link
  from public.public_links pl
  inner join public.tenants t on t.id = pl.tenant_id
  where pl.slug = lower(trim(p_slug))
    and pl.is_active = true
    and t.is_active = true
  limit 1;

  if not found then
    raise exception 'Link pÃºblico de cadastro invÃ¡lido ou inativo.'
      using errcode = 'P0002';
  end if;

  v_clean_whatsapp := nullif(regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g'), '');
  v_clean_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_raw_instagram := nullif(trim(coalesce(p_instagram_handle, '')), '');
  v_norm_instagram := nullif(lower(regexp_replace(coalesce(v_raw_instagram, ''), '^@+', '')), '');

  if v_clean_whatsapp is null and v_clean_email is null then
    raise exception 'Informe ao menos um canal de contato (WhatsApp ou e-mail).'
      using errcode = 'P0003';
  end if;

  select id, unsubscribe_token
  into v_existing
  from public.contacts
  where tenant_id = v_link.tenant_id
    and data_scope = v_link.data_scope
    and (
      (v_clean_whatsapp is not null and whatsapp = v_clean_whatsapp)
      or (v_clean_email is not null and email = v_clean_email)
      or (v_norm_instagram is not null and instagram_handle_normalized = v_norm_instagram)
    )
  order by created_at asc
  limit 1;

  if found then
    v_contact_id := v_existing.id;
    v_unsubscribe_token := v_existing.unsubscribe_token;
    v_action_name := 'contact.public_reconsented';

    update public.contacts
    set
      full_name = trim(p_full_name),
      whatsapp = coalesce(v_clean_whatsapp, whatsapp),
      email = coalesce(v_clean_email, email),
      instagram_handle = coalesce(v_raw_instagram, instagram_handle),
      instagram_handle_normalized = coalesce(v_norm_instagram, instagram_handle_normalized),
      city = trim(p_city),
      neighborhood = coalesce(nullif(trim(coalesce(p_neighborhood, '')), ''), neighborhood),
      birth_day = coalesce(p_birth_day, birth_day),
      birth_month = coalesce(p_birth_month, birth_month),
      contact_category = 'supporter',
      consent_status = 'granted',
      consent_source = trim(p_consent_source),
      consent_version = trim(p_consent_version),
      consented_at = v_now,
      revoked_at = null
    where id = v_contact_id;
  else
    insert into public.contacts (
      tenant_id,
      data_scope,
      full_name,
      whatsapp,
      email,
      instagram_handle,
      instagram_handle_normalized,
      city,
      neighborhood,
      birth_day,
      birth_month,
      contact_category,
      consent_status,
      consent_source,
      consent_version,
      consented_at,
      original_registered_at
    )
    values (
      v_link.tenant_id,
      v_link.data_scope,
      trim(p_full_name),
      v_clean_whatsapp,
      v_clean_email,
      v_raw_instagram,
      v_norm_instagram,
      trim(p_city),
      nullif(trim(coalesce(p_neighborhood, '')), ''),
      p_birth_day,
      p_birth_month,
      'supporter',
      'granted',
      trim(p_consent_source),
      trim(p_consent_version),
      v_now,
      v_now
    )
    returning id, unsubscribe_token
    into v_contact_id, v_unsubscribe_token;
  end if;

  if p_interest_ids is not null and array_length(p_interest_ids, 1) > 0 then
    insert into public.contact_interests (tenant_id, contact_id, interest_id)
    select
      v_link.tenant_id,
      v_contact_id,
      i.id
    from public.interests i
    where i.id = any(p_interest_ids)
      and i.tenant_id = v_link.tenant_id
      and i.data_scope = v_link.data_scope
    on conflict do nothing;
  end if;

  insert into public.consent_records (
    tenant_id,
    data_scope,
    contact_id,
    action,
    source,
    consent_version,
    consent_text_snapshot,
    recorded_at,
    ip_hash,
    user_agent
  )
  values (
    v_link.tenant_id,
    v_link.data_scope,
    v_contact_id,
    'granted',
    trim(p_consent_source),
    trim(p_consent_version),
    p_consent_text_snapshot,
    v_now,
    p_ip_hash,
    p_user_agent
  );

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
    v_link.tenant_id,
    v_link.data_scope,
    null,
    v_action_name,
    'contact',
    v_contact_id,
    jsonb_build_object(
      'public_link_slug', v_link.slug,
      'consent_source', trim(p_consent_source),
      'consent_version', trim(p_consent_version)
    )
  );

  return jsonb_build_object(
    'contact_id', v_contact_id,
    'unsubscribe_token', v_unsubscribe_token,
    'consented_at', v_now,
    'reconsented', (v_action_name = 'contact.public_reconsented')
  );
end;
$$;

revoke all on function public.register_public_supporter(
  text, text, text, text, text, text, smallint, smallint, uuid[], boolean, text, text, text, text, text, text
) from public;
grant execute on function public.register_public_supporter(
  text, text, text, text, text, text, smallint, smallint, uuid[], boolean, text, text, text, text, text, text
) to anon, authenticated;


-- ==================== 0007_demands_actions_and_storage.sql ====================
-- ============================================================================
-- Mandato+ | MigraÃ§Ã£o 0007: Demandas nos Bairros, TransparÃªncia e Storage
-- ============================================================================
-- 100% nÃ£o-destrutiva e idempotente. RLS habilitado em todas as novas tabelas.
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

-- 3. Tabela de AÃ§Ãµes / TransparÃªncia do Mandato
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

-- RPC pÃºblica para pÃ¡gina de transparÃªncia do mandato (/transparencia/[slug])
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

-- 4. Bucket pÃºblico controlado para avatares e logotipos (Supabase Storage)
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


