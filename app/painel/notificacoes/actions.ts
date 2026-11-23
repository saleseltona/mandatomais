"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import {
  manualReminderSchema,
  reminderSettingsSchema,
} from "@/lib/utils/team-reminders";

export interface ReminderActionState {
  error: string | null;
  success: string | null;
}

export async function saveReminderSettingsAction(
  _prevState: ReminderActionState,
  formData: FormData
): Promise<ReminderActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const rawScope = String(formData.get("dataScope") ?? "mandate");
  const ctx = await loadAuthenticatedMembership(rawScope);
  if (!ctx.tenant || !hasPermission(ctx.role, "links:manage")) {
    return {
      error: "Apenas proprietários e administradores podem alterar os lembretes.",
      success: null,
    };
  }

  const selectedDays = formData
    .getAll("daysAhead")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 30);

  const parsed = reminderSettingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    daysAhead: selectedDays,
    includeBirthdays: formData.get("includeBirthdays") === "on",
    includeOpenDemands: formData.get("includeOpenDemands") === "on",
    digestHourBrt: formData.get("digestHourBrt") ?? 8,
    dataScope: rawScope === "campaign" ? "campaign" : "mandate",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Configurações de lembrete inválidas.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("team_reminder_settings").upsert(
    {
      tenant_id: ctx.tenant.id,
      data_scope: parsed.data.dataScope,
      enabled: parsed.data.enabled,
      days_ahead: parsed.data.daysAhead,
      include_birthdays: parsed.data.includeBirthdays,
      include_open_demands: parsed.data.includeOpenDemands,
      digest_hour_brt: parsed.data.digestHourBrt,
      updated_by: ctx.userId,
    },
    { onConflict: "tenant_id,data_scope" }
  );

  if (error) {
    return {
      error:
        "Não foi possível salvar as preferências. Confirme se a migração 0009 foi aplicada no Supabase.",
      success: null,
    };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.userId,
    action: "team_reminders.settings_updated",
    entity_type: "team_reminder_settings",
    entity_id: null,
    metadata: {
      data_scope: parsed.data.dataScope,
      enabled: parsed.data.enabled,
      days_ahead: parsed.data.daysAhead,
    },
  });

  revalidatePath("/painel/notificacoes");
  return {
    error: null,
    success: "Preferências de lembretes atualizadas.",
  };
}

export async function createManualReminderAction(
  _prevState: ReminderActionState,
  formData: FormData
): Promise<ReminderActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const rawScope = String(formData.get("dataScope") ?? "mandate");
  const ctx = await loadAuthenticatedMembership(rawScope);
  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:edit")) {
    return {
      error: "Seu perfil não tem permissão para registrar lembretes da equipe.",
      success: null,
    };
  }

  const parsed = manualReminderSchema.safeParse({
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    targetDate: formData.get("targetDate") ?? "",
    dataScope: rawScope === "campaign" ? "campaign" : "mandate",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados do lembrete inválidos.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("team_notifications")
    .insert({
      tenant_id: ctx.tenant.id,
      data_scope: parsed.data.dataScope,
      kind: "manual",
      title: parsed.data.title,
      body: parsed.data.body,
      target_date: parsed.data.targetDate,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error:
        "Não foi possível salvar o lembrete. Confirme se a migração 0009 foi aplicada no Supabase.",
      success: null,
    };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.userId,
    action: "team_notification.created",
    entity_type: "team_notification",
    entity_id: created.id,
    metadata: {
      data_scope: parsed.data.dataScope,
      target_date: parsed.data.targetDate,
    },
  });

  revalidatePath("/painel/notificacoes");
  return {
    error: null,
    success: "Lembrete registrado para a equipe.",
  };
}

export async function markNotificationReadAction(
  formData: FormData
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const id = String(formData.get("notificationId") ?? "");
  const scope = String(formData.get("dataScope") ?? "mandate");
  if (!id) return;

  const ctx = await loadAuthenticatedMembership(scope);
  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:edit")) return;

  const supabase = await createClient();
  await supabase
    .from("team_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: ctx.userId,
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  revalidatePath("/painel/notificacoes");
}

export async function deleteNotificationAction(
  formData: FormData
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const id = String(formData.get("notificationId") ?? "");
  const scope = String(formData.get("dataScope") ?? "mandate");
  if (!id) return;

  const ctx = await loadAuthenticatedMembership(scope);
  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:delete")) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_notifications")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id);

  if (!error) {
    await supabase.from("audit_logs").insert({
      tenant_id: ctx.tenant.id,
      actor_user_id: ctx.userId,
      action: "team_notification.deleted",
      entity_type: "team_notification",
      entity_id: id,
      metadata: { data_scope: ctx.activeScope },
    });
  }

  revalidatePath("/painel/notificacoes");
}
