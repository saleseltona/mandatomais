-- ============================================================================
-- Mandato+ | Migração 0006: @Instagram, Importação, Conciliação e Integrações
-- ============================================================================
-- Regras aplicadas diretamente no banco:
-- 1. Contatos importados NUNCA recebem consent_status = 'granted' automaticamente
--    e usam consent_status = 'pending' (sem autorização de envio).
-- 2. Categorias distintas: supporter | registered_contact | imported_record.
-- 3. Data da importação nunca sobrescreve consented_at nem original_registered_at.
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

-- 2. Categoria distinta de contato (não misturar apoiador declarado com importado)
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

-- 3. Lotes de importação (rastreabilidade e retenção controlada — sem arquivo bruto)
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

-- 4. Expansão não-destrutiva de public.contacts
alter table public.contacts
  add column if not exists instagram_handle text,
  add column if not exists instagram_handle_normalized text,
  add column if not exists contact_category public.contact_category_enum not null default 'supporter',
  add column if not exists original_registered_at timestamptz,
  add column if not exists import_batch_id uuid references public.import_batches(id) on delete set null;

-- Permite que registros importados de arquivo (ex.: exportação do Instagram) tenham apenas @Instagram sem telefone/e-mail
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

-- 5. Linhas de revisão e conciliação de importação
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

-- 6. Histórico de mesclagens com snapshot para desfazer (undo)
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

-- 7. Integrações oficiais por mandato (ex.: Meta / Instagram oficial)
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
-- ATUALIZA RPCs PÚBLICAS PARA IDENTIDADE VISUAL E @INSTAGRAM OPCIONAL
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
    raise exception 'Consentimento explícito é obrigatório para concluir o cadastro.'
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
    raise exception 'Link público de cadastro inválido ou inativo.'
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
