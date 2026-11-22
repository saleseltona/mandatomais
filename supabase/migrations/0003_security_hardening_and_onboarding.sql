-- ============================================================================
-- Mandato+ | Migração 0003: Hardening de Segurança, Deduplicação e Onboarding
-- ============================================================================
-- 1. Remove política RLS pública `public_links_select_active_public` (evita
--    enumeração de tenants/links por `anon`; acesso público segue via RPC).
-- 2. Validação de calendário real para dia/mês de aniversário.
-- 3. Integridade de tenant_id e data_scope em `contact_interests`.
-- 4. Deduplicação segura em `register_public_supporter` (reconsentimento
--    auditado sem duplicar contatos no mesmo tenant/escopo).
-- 5. RPC segura `bootstrap_first_tenant` para onboarding self-service.
-- ============================================================================

-- 1. Fecha exposição direta da tabela public_links para o papel anon
drop policy if exists "public_links_select_active_public" on public.public_links;

-- 2. Constraint de calendário real para aniversário (sem exigir ano)
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

-- Índices para buscas rápidas de deduplicação por tenant e escopo
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

-- 4. Atualiza register_public_supporter com deduplicação e reconsentimento auditado
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

  if v_clean_whatsapp is null and v_clean_email is null then
    raise exception 'Informe ao menos um canal de contato (WhatsApp ou e-mail).'
      using errcode = 'P0003';
  end if;

  -- Verifica se já existe contato com mesmo WhatsApp ou e-mail no mesmo tenant/escopo
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

-- 5. RPC segura para onboarding do primeiro mandato pelo usuário autenticado
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
    raise exception 'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.tenant_members where user_id = v_user_id
  ) then
    raise exception 'Este usuário já está vinculado a um mandato.'
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
