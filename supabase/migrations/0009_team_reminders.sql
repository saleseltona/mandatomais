-- ============================================================================
-- Mandato+ | Migração 0009: Lembretes Antecipados e Notificações da Equipe
-- ============================================================================
-- 100% não-destrutiva e idempotente. Não altera tabelas ou migrações 0001..0008.
-- Escopo estritamente interno para a equipe do mandato/campanha (nenhum disparo
-- automático para cidadãos).
-- ============================================================================

-- 1. Configurações de lembretes antecipados por ambiente (tenant + escopo)
create table if not exists public.team_reminder_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  enabled boolean not null default true,
  days_ahead integer[] not null default '{0, 1, 3, 7}'::integer[],
  include_birthdays boolean not null default true,
  include_open_demands boolean not null default true,
  digest_hour_brt integer not null default 8
    check (digest_hour_brt between 6 and 21),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, data_scope)
);

drop trigger if exists trg_team_reminder_settings_updated_at on public.team_reminder_settings;
create trigger trg_team_reminder_settings_updated_at
before update on public.team_reminder_settings
for each row execute function public.set_updated_at();

-- 2. Central de notificações e lembretes internos da equipe
create table if not exists public.team_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_scope public.data_scope_enum not null default 'mandate',
  kind text not null default 'manual'
    check (kind in ('birthday_upcoming', 'demand_pending', 'survey_alert', 'manual')),
  title text not null check (char_length(trim(title)) >= 3),
  body text,
  target_date date,
  reference_entity_type text,
  reference_entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  read_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_team_notifications_tenant_scope_created
  on public.team_notifications(tenant_id, data_scope, is_read, created_at desc);

-- ============================================================================
-- RLS OBRIGATÓRIO EM TODAS AS NOVAS TABELAS
-- ============================================================================
alter table public.team_reminder_settings enable row level security;
alter table public.team_notifications enable row level security;

-- Políticas: team_reminder_settings
drop policy if exists "team_reminder_settings_select_member" on public.team_reminder_settings;
create policy "team_reminder_settings_select_member"
on public.team_reminder_settings for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "team_reminder_settings_manage_admin" on public.team_reminder_settings;
create policy "team_reminder_settings_manage_admin"
on public.team_reminder_settings for all
to authenticated
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- Políticas: team_notifications
drop policy if exists "team_notifications_select_member" on public.team_notifications;
create policy "team_notifications_select_member"
on public.team_notifications for select
to authenticated
using (public.is_tenant_member(tenant_id));

drop policy if exists "team_notifications_insert_editor" on public.team_notifications;
create policy "team_notifications_insert_editor"
on public.team_notifications for insert
to authenticated
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "team_notifications_update_editor" on public.team_notifications;
create policy "team_notifications_update_editor"
on public.team_notifications for update
to authenticated
using (public.can_edit_tenant_contacts(tenant_id))
with check (public.can_edit_tenant_contacts(tenant_id));

drop policy if exists "team_notifications_delete_admin" on public.team_notifications;
create policy "team_notifications_delete_admin"
on public.team_notifications for delete
to authenticated
using (public.is_tenant_admin(tenant_id));
