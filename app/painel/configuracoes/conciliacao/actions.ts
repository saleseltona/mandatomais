"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Contact, ImportRow, TenantRole } from "@/lib/types/database";

async function requireImportAdmin() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (
    !membership ||
    !hasPermission(membership.role as TenantRole, "imports:manage")
  ) {
    return null;
  }

  return {
    supabase,
    userId: user.id,
    tenantId: membership.tenant_id as string,
  };
}

export async function acceptMergeRowAction(formData: FormData) {
  const auth = await requireImportAdmin();
  if (!auth) return;

  const rowId = String(formData.get("rowId") ?? "");
  if (!rowId) return;

  const { data: rowData } = await auth.supabase
    .from("import_rows")
    .select("*")
    .eq("id", rowId)
    .eq("tenant_id", auth.tenantId)
    .eq("resolution", "pending")
    .maybeSingle();

  const row = rowData as ImportRow | null;
  if (!row || !row.matched_contact_id) return;

  const { data: targetData } = await auth.supabase
    .from("contacts")
    .select("*")
    .eq("id", row.matched_contact_id)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  const target = targetData as Contact | null;
  if (!target) return;

  // Preserva snapshot completo antes de mesclar para permitir desfazer (undo)
  const snapshotBefore = {
    full_name: target.full_name,
    whatsapp: target.whatsapp,
    email: target.email,
    city: target.city,
    neighborhood: target.neighborhood,
    instagram_handle: target.instagram_handle ?? null,
    instagram_handle_normalized: target.instagram_handle_normalized ?? null,
  };

  const norm = row.normalized_data ?? {};
  // Preenche apenas campos vazios sem sobrescrever consentimento nem categoria existente
  const mergedFields: Record<string, string | null> = {};
  if (!target.whatsapp && norm.whatsapp) mergedFields.whatsapp = norm.whatsapp;
  if (!target.email && norm.email) mergedFields.email = norm.email;
  if (!target.neighborhood && norm.neighborhood) {
    mergedFields.neighborhood = norm.neighborhood;
  }
  if (
    (!target.city || target.city === "Não informado") &&
    norm.city
  ) {
    mergedFields.city = norm.city;
  }
  if (!target.instagram_handle_normalized && norm.instagram_handle_normalized) {
    mergedFields.instagram_handle = norm.instagram_handle ?? null;
    mergedFields.instagram_handle_normalized = norm.instagram_handle_normalized;
  }

  if (Object.keys(mergedFields).length > 0) {
    await auth.supabase
      .from("contacts")
      .update(mergedFields)
      .eq("id", target.id)
      .eq("tenant_id", auth.tenantId);
  }

  const now = new Date().toISOString();

  await Promise.all([
    auth.supabase.from("contact_merges").insert({
      tenant_id: auth.tenantId,
      data_scope: row.data_scope,
      target_contact_id: target.id,
      import_row_id: row.id,
      match_fields: row.match_fields,
      snapshot_before: snapshotBefore,
      merged_fields: mergedFields,
      merged_by: auth.userId,
      merged_at: now,
    }),
    auth.supabase
      .from("import_rows")
      .update({
        resolution: "merged",
        resolved_by: auth.userId,
        resolved_at: now,
      })
      .eq("id", row.id),
    auth.supabase.from("audit_logs").insert({
      tenant_id: auth.tenantId,
      data_scope: row.data_scope,
      actor_user_id: auth.userId,
      action: "contact.merged_from_import",
      entity_type: "contact",
      entity_id: target.id,
      metadata: {
        import_row_id: row.id,
        match_fields: row.match_fields,
        merged_keys: Object.keys(mergedFields),
      },
    }),
  ]);

  revalidatePath("/painel/configuracoes/conciliacao");
  revalidatePath("/painel/base");
}

export async function createSeparateFromRowAction(formData: FormData) {
  const auth = await requireImportAdmin();
  if (!auth) return;

  const rowId = String(formData.get("rowId") ?? "");
  if (!rowId) return;

  const { data: rowData } = await auth.supabase
    .from("import_rows")
    .select("*")
    .eq("id", rowId)
    .eq("tenant_id", auth.tenantId)
    .eq("resolution", "pending")
    .maybeSingle();

  const row = rowData as ImportRow | null;
  if (!row) return;

  const norm = row.normalized_data ?? {};
  const { data: created } = await auth.supabase
    .from("contacts")
    .insert({
      tenant_id: auth.tenantId,
      data_scope: row.data_scope,
      full_name: norm.full_name || "Contato importado",
      whatsapp: norm.whatsapp ?? null,
      email: norm.email ?? null,
      instagram_handle: norm.instagram_handle ?? null,
      instagram_handle_normalized: norm.instagram_handle_normalized ?? null,
      city: norm.city || "Não informado",
      neighborhood: norm.neighborhood ?? null,
      contact_category: "imported_record",
      consent_status: "pending",
      consent_source: norm.original_origin || "importacao-revisada",
      consent_version: "importacao-sem-consentimento",
      consented_at: null,
      original_registered_at: norm.original_registered_at ?? null,
      import_batch_id: row.batch_id,
    })
    .select("id")
    .single();

  if (created) {
    const now = new Date().toISOString();
    await Promise.all([
      auth.supabase
        .from("import_rows")
        .update({
          resolution: "created",
          matched_contact_id: created.id,
          resolved_by: auth.userId,
          resolved_at: now,
        })
        .eq("id", row.id),
      auth.supabase.from("audit_logs").insert({
        tenant_id: auth.tenantId,
        data_scope: row.data_scope,
        actor_user_id: auth.userId,
        action: "contact.created_separate_from_reconciliation",
        entity_type: "contact",
        entity_id: created.id,
        metadata: { import_row_id: row.id },
      }),
    ]);
  }

  revalidatePath("/painel/configuracoes/conciliacao");
  revalidatePath("/painel/base");
}

export async function ignoreImportRowAction(formData: FormData) {
  const auth = await requireImportAdmin();
  if (!auth) return;

  const rowId = String(formData.get("rowId") ?? "");
  if (!rowId) return;

  await auth.supabase
    .from("import_rows")
    .update({
      resolution: "ignored",
      resolved_by: auth.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", rowId)
    .eq("tenant_id", auth.tenantId);

  revalidatePath("/painel/configuracoes/conciliacao");
}

export async function undoContactMergeAction(formData: FormData) {
  const auth = await requireImportAdmin();
  if (!auth) return;

  const mergeId = String(formData.get("mergeId") ?? "");
  if (!mergeId) return;

  const { data: merge } = await auth.supabase
    .from("contact_merges")
    .select("*")
    .eq("id", mergeId)
    .eq("tenant_id", auth.tenantId)
    .is("undone_at", null)
    .maybeSingle();

  if (!merge) return;

  const snapshot = (merge.snapshot_before ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();

  await auth.supabase
    .from("contacts")
    .update({
      full_name: String(snapshot.full_name ?? ""),
      whatsapp: (snapshot.whatsapp as string | null) ?? null,
      email: (snapshot.email as string | null) ?? null,
      city: String(snapshot.city ?? "Não informado"),
      neighborhood: (snapshot.neighborhood as string | null) ?? null,
      instagram_handle: (snapshot.instagram_handle as string | null) ?? null,
      instagram_handle_normalized:
        (snapshot.instagram_handle_normalized as string | null) ?? null,
    })
    .eq("id", merge.target_contact_id)
    .eq("tenant_id", auth.tenantId);

  await Promise.all([
    auth.supabase
      .from("contact_merges")
      .update({ undone_at: now, undone_by: auth.userId })
      .eq("id", merge.id),
    merge.import_row_id
      ? auth.supabase
          .from("import_rows")
          .update({ resolution: "pending", resolved_at: null, resolved_by: null })
          .eq("id", merge.import_row_id)
      : Promise.resolve(),
    auth.supabase.from("audit_logs").insert({
      tenant_id: auth.tenantId,
      data_scope: merge.data_scope,
      actor_user_id: auth.userId,
      action: "contact.merge_undone",
      entity_type: "contact",
      entity_id: merge.target_contact_id,
      metadata: { merge_id: merge.id },
    }),
  ]);

  revalidatePath("/painel/configuracoes/conciliacao");
  revalidatePath("/painel/base");
}
