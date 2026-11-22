"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { DemandStatus } from "@/lib/types/database";

export interface DemandActionState {
  error: string | null;
  success: string | null;
}

const createDemandSchema = z.object({
  title: z.string().trim().min(3, "Informe um título claro (mín. 3 caracteres).").max(140),
  description: z
    .string()
    .trim()
    .max(600)
    .optional()
    .transform((v) => v || null),
  category: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => v || null),
  city: z.string().trim().min(2, "Informe o município.").max(100),
  neighborhood: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
  priority: z.enum(["baixa", "media", "alta"]).default("media"),
  requesterName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  officeNote: z
    .string()
    .trim()
    .max(400)
    .optional()
    .transform((v) => v || null),
  dataScope: z.enum(["mandate", "campaign"]).default("mandate"),
});

function generateProtocol(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `DEM-${year}-${suffix}`;
}

export async function createDemandAction(
  _prevState: DemandActionState,
  formData: FormData
): Promise<DemandActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const ctx = await loadAuthenticatedMembership(
    String(formData.get("dataScope") ?? "mandate")
  );
  if (!ctx.tenant) return { error: "Mandato não encontrado.", success: null };

  if (!hasPermission(ctx.role, "contacts:edit")) {
    return {
      error: "Seu perfil não tem permissão para registrar demandas.",
      success: null,
    };
  }

  const parsed = createDemandSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    city: formData.get("city") ?? ctx.tenant.city ?? "",
    neighborhood: formData.get("neighborhood") ?? "",
    priority: formData.get("priority") ?? "media",
    requesterName: formData.get("requesterName") ?? "",
    officeNote: formData.get("officeNote") ?? "",
    dataScope: formData.get("dataScope") ?? "mandate",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados da demanda inválidos.",
      success: null,
    };
  }

  const supabase = await createClient();
  const protocol = generateProtocol();

  const { data: created, error } = await supabase
    .from("demands")
    .insert({
      tenant_id: ctx.tenant.id,
      data_scope: parsed.data.dataScope,
      protocol,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      city: parsed.data.city,
      neighborhood: parsed.data.neighborhood,
      priority: parsed.data.priority,
      status: "recebida",
      requester_name: parsed.data.requesterName,
      office_note: parsed.data.officeNote,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id, protocol")
    .single();

  if (error || !created) {
    return {
      error:
        "Não foi possível registrar a demanda. Confirme se a migração 0007 foi aplicada no Supabase.",
      success: null,
    };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    data_scope: parsed.data.dataScope,
    actor_user_id: ctx.userId,
    action: "demand.created",
    entity_type: "demand",
    entity_id: created.id,
    metadata: { protocol: created.protocol, title: parsed.data.title },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/demandas");

  return {
    error: null,
    success: `Demanda ${created.protocol} registrada.`,
  };
}

export async function updateDemandStatusAction(formData: FormData) {
  if (!isSupabaseConfigured()) return;

  const demandId = String(formData.get("demandId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as DemandStatus;
  const officeNote = String(formData.get("officeNote") ?? "").trim() || null;

  if (
    !demandId ||
    !["recebida", "em_execucao", "resolvida"].includes(nextStatus)
  ) {
    return;
  }

  const ctx = await loadAuthenticatedMembership();
  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:edit")) {
    redirect("/painel");
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: updated } = await supabase
    .from("demands")
    .update({
      status: nextStatus,
      office_note: officeNote,
      updated_by: ctx.userId,
      resolved_at: nextStatus === "resolvida" ? now : null,
    })
    .eq("id", demandId)
    .eq("tenant_id", ctx.tenant.id)
    .select("id, data_scope, protocol")
    .maybeSingle();

  if (updated) {
    await supabase.from("audit_logs").insert({
      tenant_id: ctx.tenant.id,
      data_scope: updated.data_scope,
      actor_user_id: ctx.userId,
      action: "demand.status_updated",
      entity_type: "demand",
      entity_id: updated.id,
      metadata: { protocol: updated.protocol, status: nextStatus },
    });
  }

  revalidatePath("/painel");
  revalidatePath("/painel/demandas");
}

export async function deleteDemandAction(formData: FormData) {
  if (!isSupabaseConfigured()) return;

  const demandId = String(formData.get("demandId") ?? "");
  if (!demandId) return;

  const ctx = await loadAuthenticatedMembership();
  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:delete")) return;

  const supabase = await createClient();
  await supabase
    .from("demands")
    .delete()
    .eq("id", demandId)
    .eq("tenant_id", ctx.tenant.id);

  revalidatePath("/painel");
  revalidatePath("/painel/demandas");
}
