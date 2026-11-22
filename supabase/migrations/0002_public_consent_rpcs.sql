-- ============================================================================
-- Mandato+ | Migração 0002: RPCs Seguras para Cadastro Público e Descadastro
-- ============================================================================
-- Mantém RLS estritamente fechado para o papel `anon` nas tabelas sensíveis
-- (`contacts`, `consent_records`, `audit_logs`, `contact_interests`),
-- expondo apenas operações controladas, validadas e auditadas via RPC.
-- ============================================================================

-- 1. Consulta metadados públicos de um link ativo de cadastro (sem expor contatos)
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

-- 2. Registra apoiador via link público com consentimento explícito obrigatório
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

  -- Trilha imutável de consentimento
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

-- 3. Prévia segura para página de descadastro por token único
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

-- 4. Revoga consentimento via token de descadastro fácil (idempotente e auditado)
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
    'Consentimento revogado pelo titular através do link público de descadastro.',
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

-- Permissões de execução controladas
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
