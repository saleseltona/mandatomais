"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";

export interface MandateActionState {
  error: string | null;
  success: string | null;
}

const createActionSchema = z.object({
  title: z.string().trim().min(3, "Informe um título (mín. 3 caracteres).").max(140),
  summary: z.string().trim().min(5, "Descreva brevemente a ação realizada.").max(600),
  category: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => v || null),
  city: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  neighborhood: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  actionDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  isPublic: z.boolean(),
});

export async function createMandateActionAction(
  _prevState: MandateActionState,
  formData: FormData
): Promise<MandateActionState> {
  void _prevState;
  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const ctx = await loadAuthenticatedMembership();
  if (!ctx.tenant || !hasPermission(ctx.role, "links:manage")) {
    return {
      error: "Apenas proprietários e administradores podem publicar ações.",
      success: null,
    };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const parsed = createActionSchema.safeParse({
    title: formData.get("title") ?? "",
    summary: formData.get("summary") ?? "",
    category: formData.get("category") ?? "",
    city: formData.get("city") ?? ctx.tenant.city ?? "",
    neighborhood: formData.get("neighborhood") ?? "",
    actionDate: String(formData.get("actionDate") || todayIso),
    isPublic: formData.get("isPublic") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("mandate_actions")
    .insert({
      tenant_id: ctx.tenant.id,
      data_scope: "mandate",
      title: parsed.data.title,
      summary: parsed.data.summary,
      category: parsed.data.category,
      city: parsed.data.city,
      neighborhood: parsed.data.neighborhood,
      action_date: parsed.data.actionDate,
      is_public: parsed.data.isPublic,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error:
        "Não foi possível publicar a ação. Confirme se a migração 0007 foi aplicada no Supabase.",
      success: null,
    };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    data_scope: "mandate",
    actor_user_id: ctx.userId,
    action: "mandate_action.created",
    entity_type: "mandate_action",
    entity_id: created.id,
    metadata: { title: parsed.data.title, is_public: parsed.data.isPublic },
  });

  revalidatePath("/painel/transparencia");
  revalidatePath(`/transparencia/${ctx.tenant.slug}`);

  return { error: null, success: "Ação registrada com sucesso." };
}

export async function toggleMandateActionVisibilityAction(formData: FormData) {
  if (!isSupabaseConfigured()) return;
  const actionId = String(formData.get("actionId") ?? "");
  const nextPublic = formData.get("nextPublic") === "true";
  if (!actionId) return;

  const ctx = await loadAuthenticatedMembership();
  if (!ctx.tenant || !hasPermission(ctx.role, "links:manage")) return;

  const supabase = await createClient();
  await supabase
    .from("mandate_actions")
    .update({ is_public: nextPublic })
    .eq("id", actionId)
    .eq("tenant_id", ctx.tenant.id);

  revalidatePath("/painel/transparencia");
  revalidatePath(`/transparencia/${ctx.tenant.slug}`);
}
