-- ============================================================================
-- Mandato+ | Migração Inicial Multi-tenant, LGPD, Consentimento e Auditoria
-- ============================================================================
-- Regras aplicadas diretamente no banco de dados:
-- 1. Row Level Security (RLS) habilitado em TODAS as tabelas.
-- 2. Isolamento estrito por tenant_id (nenhum mandato acessa dados de outro).
-- 3. Separação explícita entre dados de mandato ('mandate') e campanha ('campaign').
-- 4. Minimização de dados: sem CPF, religião, etnia, biometria ou opinião política.
-- 5. Registro de origem, data/hora e versão do consentimento + trilha imutável.
-- 6. Trilha de auditoria (audit_logs) para alterações relevantes.
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

-- Função auxiliar para atualizar updated_at automaticamente
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
-- 2. Membros do Tenant (Usuários autenticados vinculados a um mandato)
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

-- Funções auxiliares de autorização multi-tenant (evitam recursão em políticas RLS)
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
-- 3. Links Públicos de Cadastro
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
-- 4. Contatos / Apoiadores (Minimização LGPD)
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
-- 6. Histórico Imutável de Consentimento (LGPD)
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
-- 7. Logs de Auditoria (Imutável)
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
-- HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ============================================================================
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.public_links enable row level security;
alter table public.contacts enable row level security;
alter table public.interests enable row level security;
alter table public.contact_interests enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_logs enable row level security;

-- Políticas: tenants
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

-- Políticas: tenant_members
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

-- Políticas: public_links
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

-- Políticas: contacts (isolamento estrito por tenant_id)
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

-- Políticas: interests
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

-- Políticas: contact_interests
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

-- Políticas: consent_records (append-only para membros do tenant)
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

-- Políticas: audit_logs (append-only para membros do tenant)
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
