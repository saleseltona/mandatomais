-- ============================================================================
-- Mandato+ | Migração 0008: Pesquisa de Percepção e Avaliação do Mandato
-- ============================================================================
-- 100% não-destrutiva e idempotente. Não altera tabelas ou migrações 0001..0007.
-- Regras LGPD e segurança aplicadas diretamente no banco:
--   1. RLS obrigatório em todas as novas tabelas (`surveys`, `survey_responses`,
--      `survey_response_analyses`). Zero acesso direto de `anon`.
--   2. Respostas anônimas têm constraint CHECK impedindo vínculo com contato
--      ou armazenamento de nome/WhatsApp/e-mail.
--   3. Consentimento para comunicações é separado e registrado em `consent_records`.
--   4. Deduplicação em janela curta por `device_hash` (anti-spam) sem bloquear
--      respostas legítimas de outras pessoas.
-- ============================================================================

-- 1. Tabela de Pesquisas
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) >= 3),
  description text,
  intro_text text,
  thank_you_text text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  response_limit integer check (response_limit is null or response_limit > 0),
  target_audience text not null default 'geral'
    check (target_audience in ('geral', 'cidade', 'bairro', 'segmento')),
  target_city text,
  target_neighborhoods text[] not null default '{}'::text[],
  target_segment text,
  use_default_questions boolean not null default true,
  custom_questions jsonb not null default '[]'::jsonb,
  questionnaire_version text not null default '1.0.0',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_surveys_tenant_scope_status
  on public.surveys(tenant_id, data_scope, status, created_at desc);

drop trigger if exists trg_surveys_updated_at on public.surveys;
create trigger trg_surveys_updated_at
before update on public.surveys
for each row execute function public.set_updated_at();

-- 2. Tabela de Respostas de Pesquisa (anônimas ou identificadas opcionalmente)
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  is_anonymous boolean not null default true,
  city text,
  neighborhood text,
  management_rating text,
  mandate_rating text,
  strength_areas text[] not null default '{}'::text[],
  improvement_areas text[] not null default '{}'::text[],
  main_neighborhood_need text check (main_neighborhood_need is null or char_length(main_neighborhood_need) <= 500),
  most_valued_action text check (most_valued_action is null or char_length(most_valued_action) <= 500),
  what_to_improve text check (what_to_improve is null or char_length(what_to_improve) <= 500),
  custom_answers jsonb not null default '{}'::jsonb,
  wants_updates boolean not null default false,
  communication_consent_granted boolean not null default false,
  communication_consent_version text,
  respondent_name text,
  respondent_whatsapp text,
  respondent_email text,
  linked_contact_id uuid references public.contacts(id) on delete set null,
  source text not null default 'link-pesquisa',
  questionnaire_version text not null default '1.0.0',
  ip_hash text,
  device_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chk_survey_anonymous_no_pii check (
    not is_anonymous
    or (
      respondent_name is null
      and respondent_whatsapp is null
      and respondent_email is null
      and linked_contact_id is null
    )
  )
);

create index if not exists idx_survey_responses_survey_created
  on public.survey_responses(survey_id, created_at desc);

create index if not exists idx_survey_responses_tenant_created
  on public.survey_responses(tenant_id, data_scope, created_at desc);

create index if not exists idx_survey_responses_device_recent
  on public.survey_responses(survey_id, device_hash, created_at desc)
  where device_hash is not null;

-- 3. Tabela de Análise Qualitativa das Respostas Abertas
create table if not exists public.survey_response_analyses (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.survey_responses(id) on delete cascade,
  survey_id uuid not null references public.surveys(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  theme text,
  classification text not null default 'observacao'
    check (classification in ('elogio', 'critica', 'sugestao', 'demanda', 'observacao')),
  priority text not null default 'media'
    check (priority in ('baixa', 'media', 'alta')),
  status text not null default 'nova'
    check (status in ('nova', 'em_analise', 'encaminhada', 'respondida', 'arquivada')),
  linked_demand_id uuid references public.demands(id) on delete set null,
  linked_action_id uuid references public.mandate_actions(id) on delete set null,
  internal_note text,
  analyzed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_survey_analyses_survey_status
  on public.survey_response_analyses(survey_id, status, priority);

drop trigger if exists trg_survey_analyses_updated_at on public.survey_response_analyses;
create trigger trg_survey_analyses_updated_at
before update on public.survey_response_analyses
for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS OBRIGATÓRIO EM TODAS AS NOVAS TABELAS
-- ============================================================================
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_response_analyses enable row level security;

-- Políticas: surveys
drop policy if exists "surveys_select_own_tenant" on public.surveys;
create policy "surveys_select_own_tenant"
on public.surveys for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "surveys_manage_admin" on public.surveys;
create policy "surveys_manage_admin"
on public.surveys for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- Políticas: survey_responses (zero acesso direto para anon)
drop policy if exists "survey_responses_select_own_tenant" on public.survey_responses;
create policy "survey_responses_select_own_tenant"
on public.survey_responses for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "survey_responses_delete_admin" on public.survey_responses;
create policy "survey_responses_delete_admin"
on public.survey_responses for delete
to authenticated
using (public.is_tenant_admin(tenant_id));

-- Políticas: survey_response_analyses
drop policy if exists "survey_analyses_select_own_tenant" on public.survey_response_analyses;
create policy "survey_analyses_select_own_tenant"
on public.survey_response_analyses for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "survey_analyses_insert_editor" on public.survey_response_analyses;
create policy "survey_analyses_insert_editor"
on public.survey_response_analyses for insert
to authenticated
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "survey_analyses_update_editor" on public.survey_response_analyses;
create policy "survey_analyses_update_editor"
on public.survey_response_analyses for update
to authenticated
using (public.can_edit_tenant_contacts(tenant_id))
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "survey_analyses_delete_admin" on public.survey_response_analyses;
create policy "survey_analyses_delete_admin"
on public.survey_response_analyses for delete
to authenticated
using (public.is_tenant_admin(tenant_id));

-- ============================================================================
-- RPCs PÚBLICAS SEGURAS (SECURITY DEFINER)
-- ============================================================================

-- 1. Metadados públicos da pesquisa ativa (nunca expõe respostas)
create or replace function public.get_public_survey(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey record;
  v_total_responses integer;
  v_public_link_slug text;
begin
  select
    s.*,
    t.slug as tenant_slug,
    coalesce(nullif(trim(t.public_display_name), ''), t.name) as tenant_display_name,
    t.office_title,
    t.city as tenant_city,
    t.state as tenant_state,
    t.primary_color,
    t.accent_color,
    t.logo_url,
    t.avatar_url
  into v_survey
  from public.surveys s
  inner join public.tenants t on t.id = s.tenant_id
  where s.slug = lower(trim(p_slug))
    and t.is_active = true
  limit 1;

  if not found then
    return null;
  end if;

  select count(*)::int into v_total_responses
  from public.survey_responses
  where survey_id = v_survey.id;

  select pl.slug into v_public_link_slug
  from public.public_links pl
  where pl.tenant_id = v_survey.tenant_id
    and pl.data_scope = v_survey.data_scope
    and pl.is_active = true
  order by pl.created_at asc
  limit 1;

  return jsonb_build_object(
    'id', v_survey.id,
    'slug', v_survey.slug,
    'title', v_survey.title,
    'description', v_survey.description,
    'intro_text', v_survey.intro_text,
    'thank_you_text', v_survey.thank_you_text,
    'status', v_survey.status,
    'starts_at', v_survey.starts_at,
    'ends_at', v_survey.ends_at,
    'response_limit', v_survey.response_limit,
    'total_responses', v_total_responses,
    'use_default_questions', v_survey.use_default_questions,
    'custom_questions', v_survey.custom_questions,
    'questionnaire_version', v_survey.questionnaire_version,
    'data_scope', v_survey.data_scope,
    'tenant_slug', v_survey.tenant_slug,
    'tenant_display_name', v_survey.tenant_display_name,
    'office_title', v_survey.office_title,
    'tenant_city', v_survey.tenant_city,
    'tenant_state', v_survey.tenant_state,
    'primary_color', v_survey.primary_color,
    'accent_color', v_survey.accent_color,
    'logo_url', v_survey.logo_url,
    'avatar_url', v_survey.avatar_url,
    'public_registration_slug', v_public_link_slug
  );
end;
$$;

-- 2. Envio público de resposta de pesquisa (anônima ou identificada + consentimento separado)
create or replace function public.submit_public_survey_response(
  p_slug text,
  p_is_anonymous boolean,
  p_city text,
  p_neighborhood text,
  p_management_rating text,
  p_mandate_rating text,
  p_strength_areas text[],
  p_improvement_areas text[],
  p_main_neighborhood_need text,
  p_most_valued_action text,
  p_what_to_improve text,
  p_custom_answers jsonb,
  p_wants_updates boolean,
  p_communication_consent_granted boolean,
  p_communication_consent_version text,
  p_communication_consent_text text,
  p_respondent_name text,
  p_respondent_whatsapp text,
  p_respondent_email text,
  p_ip_hash text default null,
  p_device_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey record;
  v_total_responses integer;
  v_now timestamptz := timezone('utc', now());
  v_clean_whatsapp text;
  v_clean_email text;
  v_clean_name text;
  v_linked_contact_id uuid := null;
  v_unsubscribe_token uuid := null;
  v_response_id uuid;
  v_existing_contact record;
begin
  select s.*
  into v_survey
  from public.surveys s
  inner join public.tenants t on t.id = s.tenant_id
  where s.slug = lower(trim(p_slug))
    and t.is_active = true
  limit 1;

  if not found or v_survey.status <> 'active' then
    raise exception 'Esta pesquisa não está disponível para respostas no momento.'
      using errcode = 'P0010';
  end if;

  if v_survey.starts_at is not null and v_now < v_survey.starts_at then
    raise exception 'Esta pesquisa ainda não iniciou o período de coleta.'
      using errcode = 'P0011';
  end if;

  if v_survey.ends_at is not null and v_now > v_survey.ends_at then
    raise exception 'O período de coleta desta pesquisa já foi encerrado.'
      using errcode = 'P0012';
  end if;

  if v_survey.response_limit is not null then
    select count(*)::int into v_total_responses
    from public.survey_responses
    where survey_id = v_survey.id;

    if v_total_responses >= v_survey.response_limit then
      raise exception 'Esta pesquisa atingiu o limite máximo de respostas.'
        using errcode = 'P0013';
    end if;
  end if;

  -- Proteção contra envio duplicado pelo mesmo dispositivo em 15 minutos
  if p_device_hash is not null and char_length(trim(p_device_hash)) > 0 then
    if exists (
      select 1
      from public.survey_responses
      where survey_id = v_survey.id
        and device_hash = p_device_hash
        and created_at > (v_now - interval '15 minutes')
    ) then
      raise exception 'Já recebemos sua resposta recentemente neste dispositivo. Obrigado por participar.'
        using errcode = 'P0014';
    end if;
  end if;

  -- Higieniza PII somente quando o respondente optou por se identificar
  if p_is_anonymous is true then
    v_clean_name := null;
    v_clean_whatsapp := null;
    v_clean_email := null;
  else
    v_clean_name := nullif(trim(coalesce(p_respondent_name, '')), '');
    v_clean_whatsapp := nullif(regexp_replace(coalesce(p_respondent_whatsapp, ''), '[^0-9]', '', 'g'), '');
    v_clean_email := nullif(lower(trim(coalesce(p_respondent_email, ''))), '');
  end if;

  -- Integração consentida com Base de Apoiadores SOMENTE se identificado + consentimento explícito
  if p_is_anonymous is false
     and p_wants_updates is true
     and p_communication_consent_granted is true
     and (v_clean_whatsapp is not null or v_clean_email is not null) then

    select id, unsubscribe_token
    into v_existing_contact
    from public.contacts
    where tenant_id = v_survey.tenant_id
      and data_scope = v_survey.data_scope
      and (
        (v_clean_whatsapp is not null and whatsapp = v_clean_whatsapp)
        or (v_clean_email is not null and email = v_clean_email)
      )
    order by created_at asc
    limit 1;

    if found then
      v_linked_contact_id := v_existing_contact.id;
      v_unsubscribe_token := v_existing_contact.unsubscribe_token;

      update public.contacts
      set
        full_name = coalesce(v_clean_name, full_name),
        whatsapp = coalesce(v_clean_whatsapp, whatsapp),
        email = coalesce(v_clean_email, email),
        city = coalesce(nullif(trim(coalesce(p_city, '')), ''), city),
        neighborhood = coalesce(nullif(trim(coalesce(p_neighborhood, '')), ''), neighborhood),
        consent_status = 'granted',
        consent_source = 'pesquisa:' || v_survey.slug,
        consent_version = coalesce(nullif(trim(coalesce(p_communication_consent_version, '')), ''), '1.0.0'),
        consented_at = v_now,
        revoked_at = null
      where id = v_linked_contact_id;
    else
      insert into public.contacts (
        tenant_id,
        data_scope,
        full_name,
        whatsapp,
        email,
        city,
        neighborhood,
        contact_category,
        consent_status,
        consent_source,
        consent_version,
        consented_at,
        original_registered_at
      )
      values (
        v_survey.tenant_id,
        v_survey.data_scope,
        coalesce(v_clean_name, 'Participante da pesquisa'),
        v_clean_whatsapp,
        v_clean_email,
        coalesce(nullif(trim(coalesce(p_city, '')), ''), 'Não informado'),
        nullif(trim(coalesce(p_neighborhood, '')), ''),
        'registered_contact',
        'granted',
        'pesquisa:' || v_survey.slug,
        coalesce(nullif(trim(coalesce(p_communication_consent_version, '')), ''), '1.0.0'),
        v_now,
        v_now
      )
      returning id, unsubscribe_token
      into v_linked_contact_id, v_unsubscribe_token;
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
      v_survey.tenant_id,
      v_survey.data_scope,
      v_linked_contact_id,
      'granted',
      'pesquisa:' || v_survey.slug,
      coalesce(nullif(trim(coalesce(p_communication_consent_version, '')), ''), '1.0.0'),
      coalesce(p_communication_consent_text, 'Consentimento explícito na pesquisa de percepção.'),
      v_now,
      p_ip_hash,
      p_user_agent
    );
  end if;

  insert into public.survey_responses (
    survey_id,
    tenant_id,
    data_scope,
    is_anonymous,
    city,
    neighborhood,
    management_rating,
    mandate_rating,
    strength_areas,
    improvement_areas,
    main_neighborhood_need,
    most_valued_action,
    what_to_improve,
    custom_answers,
    wants_updates,
    communication_consent_granted,
    communication_consent_version,
    respondent_name,
    respondent_whatsapp,
    respondent_email,
    linked_contact_id,
    source,
    questionnaire_version,
    ip_hash,
    device_hash
  )
  values (
    v_survey.id,
    v_survey.tenant_id,
    v_survey.data_scope,
    p_is_anonymous,
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_neighborhood, '')), ''),
    nullif(trim(coalesce(p_management_rating, '')), ''),
    nullif(trim(coalesce(p_mandate_rating, '')), ''),
    coalesce(p_strength_areas, '{}'::text[]),
    coalesce(p_improvement_areas, '{}'::text[]),
    nullif(trim(coalesce(p_main_neighborhood_need, '')), ''),
    nullif(trim(coalesce(p_most_valued_action, '')), ''),
    nullif(trim(coalesce(p_what_to_improve, '')), ''),
    coalesce(p_custom_answers, '{}'::jsonb),
    coalesce(p_wants_updates, false),
    coalesce(p_communication_consent_granted, false),
    case when p_communication_consent_granted then coalesce(p_communication_consent_version, '1.0.0') else null end,
    v_clean_name,
    v_clean_whatsapp,
    v_clean_email,
    v_linked_contact_id,
    'link-pesquisa:' || v_survey.slug,
    v_survey.questionnaire_version,
    p_ip_hash,
    p_device_hash
  )
  returning id into v_response_id;

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
    v_survey.tenant_id,
    v_survey.data_scope,
    null,
    'survey.response_submitted',
    'survey_response',
    v_response_id,
    jsonb_build_object(
      'survey_slug', v_survey.slug,
      'is_anonymous', p_is_anonymous,
      'communication_consent_granted', coalesce(p_communication_consent_granted, false)
    )
  );

  return jsonb_build_object(
    'response_id', v_response_id,
    'unsubscribe_token', v_unsubscribe_token,
    'recorded_at', v_now
  );
end;
$$;

revoke all on function public.get_public_survey(text) from public;
grant execute on function public.get_public_survey(text) to anon, authenticated;

revoke all on function public.submit_public_survey_response(
  text, boolean, text, text, text, text, text[], text[], text, text, text, jsonb, boolean, boolean, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.submit_public_survey_response(
  text, boolean, text, text, text, text, text[], text[], text, text, text, jsonb, boolean, boolean, text, text, text, text, text, text, text, text
) to anon, authenticated;
