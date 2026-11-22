"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { DataScope, TenantRole } from "@/lib/types/database";
import {
  matchCandidateAgainstExisting,
  normalizeImportRow,
  type ColumnMapping,
  type ExistingContactIndexEntry,
} from "@/lib/utils/import-parser";

export interface ImportBatchResult {
  error: string | null;
  batchId?: string;
  summary?: {
    total: number;
    created: number;
    pendingReview: number;
    rejected: number;
    rejectedSamples: Array<{ rowNumber: number; reason: string }>;
  };
}

const importPayloadSchema = z.object({
  fileName: z.string().trim().min(1).max(160),
  dataScope: z.enum(["mandate", "campaign"]),
  declaredOrigin: z
    .string()
    .trim()
    .min(2, "Informe a origem declarada da base.")
    .max(120),
  declaredPurpose: z
    .string()
    .trim()
    .min(3, "Informe a finalidade de uso dos dados.")
    .max(200),
  legalBasis: z
    .string()
    .trim()
    .min(2, "Selecione ou informe a base legal aplicável.")
    .max(120),
  rows: z.array(z.record(z.string())).min(1, "Nenhuma linha para importar.").max(1000, "Máximo de 1.000 linhas por lote nesta etapa."),
  mapping: z.object({
    fullName: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    city: z.string(),
    neighborhood: z.string(),
    instagram: z.string(),
    originalOrigin: z.string(),
    originalRegisteredAt: z.string(),
  }),
});

export async function processImportBatchAction(payload: {
  fileName: string;
  dataScope: DataScope;
  declaredOrigin: string;
  declaredPurpose: string;
  legalBasis: string;
  rows: Record<string, string>[];
  mapping: ColumnMapping;
}): Promise<ImportBatchResult> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado." };
  }

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
    return { error: "Você não tem permissão para importar bases." };
  }

  const parsed = importPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados de importação inválidos.",
    };
  }

  const tenantId = membership.tenant_id as string;
  const { dataScope } = parsed.data;

  // Carrega contatos existentes no mesmo tenant + data_scope para conciliação
  const { data: existingRows } = await supabase
    .from("contacts")
    .select("id, full_name, city, whatsapp, email, instagram_handle_normalized")
    .eq("tenant_id", tenantId)
    .eq("data_scope", dataScope);

  const existingContacts =
    (existingRows as ExistingContactIndexEntry[] | null) ?? [];

  // Cria o lote de importação (sem armazenar arquivo bruto)
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      tenant_id: tenantId,
      data_scope: dataScope,
      imported_by: user.id,
      file_name: parsed.data.fileName,
      declared_origin: parsed.data.declaredOrigin,
      declared_purpose: parsed.data.declaredPurpose,
      legal_basis: parsed.data.legalBasis,
      total_rows: parsed.data.rows.length,
      status: "processing",
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return {
      error:
        "Não foi possível criar o lote de importação. Confirme se a migração 0006 foi aplicada no Supabase.",
    };
  }

  let createdCount = 0;
  let pendingReviewCount = 0;
  let rejectedCount = 0;
  const rejectedSamples: Array<{ rowNumber: number; reason: string }> = [];
  const importRowRecords: Array<Record<string, unknown>> = [];

  for (let i = 0; i < parsed.data.rows.length; i += 1) {
    const candidate = normalizeImportRow(
      parsed.data.rows[i],
      i + 2, // linha da planilha considerando cabeçalho na linha 1
      parsed.data.mapping
    );

    if (candidate.validationError) {
      rejectedCount += 1;
      if (rejectedSamples.length < 25) {
        rejectedSamples.push({
          rowNumber: candidate.rowNumber,
          reason: candidate.validationError,
        });
      }
      importRowRecords.push({
        batch_id: batch.id,
        tenant_id: tenantId,
        data_scope: dataScope,
        row_number: candidate.rowNumber,
        raw_data: candidate.rawData,
        normalized_data: {},
        match_type: "no_match",
        resolution: "rejected",
        error_message: candidate.validationError,
      });
      continue;
    }

    const match = matchCandidateAgainstExisting(candidate, existingContacts);

    if (match.matchType === "no_match") {
      // Insere contato como 'imported_record' com consent_status = 'pending'
      // NUNCA marca como consentido nem grava data de importação como data de consentimento!
      const { data: inserted, error: insError } = await supabase
        .from("contacts")
        .insert({
          tenant_id: tenantId,
          data_scope: dataScope,
          full_name: candidate.fullName,
          whatsapp: candidate.whatsapp,
          email: candidate.email,
          instagram_handle: candidate.instagramRaw,
          instagram_handle_normalized: candidate.instagramNormalized,
          city: candidate.city ?? "Não informado",
          neighborhood: candidate.neighborhood,
          contact_category: "imported_record",
          consent_status: "pending",
          consent_source:
            candidate.originalOrigin || `importacao:${parsed.data.declaredOrigin}`,
          consent_version: "importacao-sem-consentimento",
          consented_at: null,
          original_registered_at: candidate.originalRegisteredAt,
          import_batch_id: batch.id,
        })
        .select("id, full_name, city, whatsapp, email, instagram_handle_normalized")
        .single();

      if (insError || !inserted) {
        rejectedCount += 1;
        const reason = "Erro ao gravar registro no banco.";
        if (rejectedSamples.length < 25) {
          rejectedSamples.push({ rowNumber: candidate.rowNumber, reason });
        }
        importRowRecords.push({
          batch_id: batch.id,
          tenant_id: tenantId,
          data_scope: dataScope,
          row_number: candidate.rowNumber,
          raw_data: candidate.rawData,
          normalized_data: {
            full_name: candidate.fullName,
            whatsapp: candidate.whatsapp,
            email: candidate.email,
            city: candidate.city,
            neighborhood: candidate.neighborhood,
            instagram_handle: candidate.instagramRaw,
            instagram_handle_normalized: candidate.instagramNormalized,
          },
          match_type: "no_match",
          resolution: "rejected",
          error_message: reason,
        });
      } else {
        createdCount += 1;
        existingContacts.push(inserted as ExistingContactIndexEntry);
        importRowRecords.push({
          batch_id: batch.id,
          tenant_id: tenantId,
          data_scope: dataScope,
          row_number: candidate.rowNumber,
          raw_data: candidate.rawData,
          normalized_data: {
            full_name: candidate.fullName,
            whatsapp: candidate.whatsapp,
            email: candidate.email,
            city: candidate.city,
            neighborhood: candidate.neighborhood,
            instagram_handle: candidate.instagramRaw,
            instagram_handle_normalized: candidate.instagramNormalized,
          },
          match_type: "no_match",
          matched_contact_id: inserted.id,
          resolution: "created",
        });
      }
    } else {
      // Correspondência ou possível duplicidade vai para Conciliação manual (nunca mescla no escuro!)
      pendingReviewCount += 1;
      importRowRecords.push({
        batch_id: batch.id,
        tenant_id: tenantId,
        data_scope: dataScope,
        row_number: candidate.rowNumber,
        raw_data: candidate.rawData,
        normalized_data: {
          full_name: candidate.fullName,
          whatsapp: candidate.whatsapp,
          email: candidate.email,
          city: candidate.city,
          neighborhood: candidate.neighborhood,
          instagram_handle: candidate.instagramRaw,
          instagram_handle_normalized: candidate.instagramNormalized,
          original_origin: candidate.originalOrigin,
          original_registered_at: candidate.originalRegisteredAt,
        },
        match_type: match.matchType,
        matched_contact_id: match.matchedContactId,
        match_fields: match.matchFields,
        resolution: "pending",
      });
    }
  }

  if (importRowRecords.length > 0) {
    await supabase.from("import_rows").insert(importRowRecords);
  }

  await Promise.all([
    supabase
      .from("import_batches")
      .update({
        imported_count: createdCount,
        pending_review_count: pendingReviewCount,
        rejected_count: rejectedCount,
        status: "completed",
      })
      .eq("id", batch.id),
    supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      data_scope: dataScope,
      actor_user_id: user.id,
      action: "import_batch.completed",
      entity_type: "import_batch",
      entity_id: batch.id,
      metadata: {
        file_name: parsed.data.fileName,
        declared_origin: parsed.data.declaredOrigin,
        declared_purpose: parsed.data.declaredPurpose,
        legal_basis: parsed.data.legalBasis,
        total_rows: parsed.data.rows.length,
        created_count: createdCount,
        pending_review_count: pendingReviewCount,
        rejected_count: rejectedCount,
      },
    }),
  ]);

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  revalidatePath("/painel/configuracoes/importacao");
  revalidatePath("/painel/configuracoes/conciliacao");

  return {
    error: null,
    batchId: batch.id,
    summary: {
      total: parsed.data.rows.length,
      created: createdCount,
      pendingReview: pendingReviewCount,
      rejected: rejectedCount,
      rejectedSamples,
    },
  };
}

export async function deleteImportBatchAction(formData: FormData) {
  if (!isSupabaseConfigured()) return;

  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) return;

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
    return;
  }

  await supabase
    .from("import_batches")
    .delete()
    .eq("id", batchId)
    .eq("tenant_id", membership.tenant_id);

  await supabase.from("audit_logs").insert({
    tenant_id: membership.tenant_id,
    data_scope: "mandate",
    actor_user_id: user.id,
    action: "import_batch.deleted",
    entity_type: "import_batch",
    entity_id: batchId,
    metadata: {},
  });

  revalidatePath("/painel/configuracoes/importacao");
  revalidatePath("/painel/configuracoes/conciliacao");
}
