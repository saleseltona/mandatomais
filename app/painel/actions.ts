"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CONSENT_STATEMENT_PT_BR,
  CURRENT_CONSENT_VERSION,
} from "@/lib/constants/consent";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  bootstrapTenantSchema,
  createPublicLinkSchema,
  publicRegistrationSchema,
  updateContactSchema,
} from "@/lib/validation/public-registration";

export interface ActionFeedbackState {
  error: string | null;
  success: string | null;
}

export type CreateLinkActionState = ActionFeedbackState;
export type CreateInterestActionState = ActionFeedbackState;
export type BootstrapTenantActionState = ActionFeedbackState;
export type UpdateContactActionState = ActionFeedbackState;

const createInterestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome de interesse com pelo menos 2 caracteres.")
    .max(60, "O nome do interesse pode ter no máximo 60 caracteres."),
  dataScope: z.enum(["mandate", "campaign"]),
});

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/entrar");
}

export async function bootstrapTenantAction(
  _prevState: BootstrapTenantActionState,
  formData: FormData
): Promise<BootstrapTenantActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const parsed = bootstrapTenantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    officeTitle: formData.get("officeTitle"),
    city: formData.get("city"),
    state: formData.get("state"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados do mandato inválidos.",
      success: null,
    };
  }

  const profileFullName = String(formData.get("profileFullName") ?? "").trim();
  const profilePhone = String(formData.get("profilePhone") ?? "").trim() || null;
  const profileTeamRole =
    String(formData.get("profileTeamRole") ?? "").trim() || null;

  if (profileFullName.length >= 2) {
    await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        full_name: profileFullName,
        phone: profilePhone,
        team_role_label: profileTeamRole,
      },
      { onConflict: "user_id" }
    );
  }

  const publicDisplayName =
    String(formData.get("publicDisplayName") ?? "").trim() || null;
  const rawOrgType = String(formData.get("organizationType") ?? "mandate");
  const organizationType = ["mandate", "pre_campaign", "campaign", "other"].includes(
    rawOrgType
  )
    ? rawOrgType
    : "mandate";
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const primaryColor =
    String(formData.get("primaryColor") ?? "#0B1E36").trim() || "#0B1E36";
  const accentColor =
    String(formData.get("accentColor") ?? "#0E7C55").trim() || "#0E7C55";
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const socialInstagram =
    String(formData.get("socialInstagram") ?? "").trim() || null;

  const { error } = await supabase.rpc("bootstrap_first_tenant", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_office_title: parsed.data.officeTitle,
    p_city: parsed.data.city,
    p_state: parsed.data.state,
    p_public_display_name: publicDisplayName,
    p_organization_type: organizationType,
    p_bio: bio,
    p_primary_color: primaryColor,
    p_accent_color: accentColor,
    p_logo_url: logoUrl,
    p_avatar_url: null,
    p_social_links: socialInstagram ? { instagram: socialInstagram } : {},
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Este identificador (slug) já está em uso. Escolha outro.",
        success: null,
      };
    }
    return {
      error:
        error.message ||
        "Não foi possível criar o mandato. Confirme se as migrações 0003 e 0005 foram aplicadas no Supabase.",
      success: null,
    };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  revalidatePath("/painel/links");
  revalidatePath("/painel/configuracoes");

  const nextDest = String(formData.get("nextDestination") ?? "painel");
  if (nextDest === "links") redirect("/painel/links");
  if (nextDest === "importar") redirect("/painel/configuracoes/importacao");
  if (nextDest === "equipe") redirect("/painel/configuracoes#equipe");

  return {
    error: null,
    success: "Mandato criado e vinculado com sucesso!",
  };
}

export async function createPublicLinkAction(
  _prevState: CreateLinkActionState,
  formData: FormData
): Promise<CreateLinkActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const parsed = createPublicLinkSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    dataScope: formData.get("dataScope"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados do link inválidos.",
      success: null,
    };
  }

  const { data: membership, error: memberError } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (memberError || !membership) {
    return {
      error:
        "Apenas administradores ou titulares do mandato podem criar links públicos.",
      success: null,
    };
  }

  const { data: createdLink, error: insertError } = await supabase
    .from("public_links")
    .insert({
      tenant_id: membership.tenant_id,
      data_scope: parsed.data.dataScope,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      is_active: true,
      created_by: user.id,
    })
    .select("id, slug, data_scope")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        error: "Este identificador de link já está em uso. Escolha outro.",
        success: null,
      };
    }
    return {
      error: "Não foi possível criar o link público. Tente novamente.",
      success: null,
    };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: membership.tenant_id,
    data_scope: createdLink.data_scope,
    actor_user_id: user.id,
    action: "public_link.created",
    entity_type: "public_link",
    entity_id: createdLink.id,
    metadata: { slug: createdLink.slug, title: parsed.data.title },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  revalidatePath("/painel/links");

  return {
    error: null,
    success: `Link /cadastro/${createdLink.slug} criado com sucesso.`,
  };
}

export async function togglePublicLinkAction(formData: FormData) {
  if (!isSupabaseConfigured()) return;

  const linkId = String(formData.get("linkId") ?? "");
  const nextActive = formData.get("nextActive") === "true";

  if (!linkId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: updatedLink, error } = await supabase
    .from("public_links")
    .update({ is_active: nextActive })
    .eq("id", linkId)
    .select("id, tenant_id, data_scope, slug, is_active")
    .maybeSingle();

  if (!error && updatedLink) {
    await supabase.from("audit_logs").insert({
      tenant_id: updatedLink.tenant_id,
      data_scope: updatedLink.data_scope,
      actor_user_id: user.id,
      action: nextActive ? "public_link.activated" : "public_link.deactivated",
      entity_type: "public_link",
      entity_id: updatedLink.id,
      metadata: { slug: updatedLink.slug, is_active: updatedLink.is_active },
    });
  }

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  revalidatePath("/painel/links");
}

export async function createInterestAction(
  _prevState: CreateInterestActionState,
  formData: FormData
): Promise<CreateInterestActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const parsed = createInterestSchema.safeParse({
    name: formData.get("name"),
    dataScope: formData.get("dataScope"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Interesse inválido.",
      success: null,
    };
  }

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { error: "Mandato não encontrado para este usuário.", success: null };
  }

  const { data: created, error } = await supabase
    .from("interests")
    .insert({
      tenant_id: membership.tenant_id,
      data_scope: parsed.data.dataScope,
      name: parsed.data.name,
    })
    .select("id, name, data_scope")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Este tema de interesse já existe neste escopo.",
        success: null,
      };
    }
    return {
      error: "Não foi possível cadastrar o interesse. Tente novamente.",
      success: null,
    };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: membership.tenant_id,
    data_scope: created.data_scope,
    actor_user_id: user.id,
    action: "interest.created",
    entity_type: "interest",
    entity_id: created.id,
    metadata: { name: created.name },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  revalidatePath("/painel/links");

  return {
    error: null,
    success: `Tema "${created.name}" adicionado.`,
  };
}

export async function logBirthdayGreetingAction(contactId: string) {
  if (!isSupabaseConfigured() || !contactId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, tenant_id, data_scope, consent_status")
    .eq("id", contactId)
    .eq("consent_status", "granted")
    .maybeSingle();

  if (!contact) return;

  await supabase.from("audit_logs").insert({
    tenant_id: contact.tenant_id,
    data_scope: contact.data_scope,
    actor_user_id: user.id,
    action: "contact.birthday_whatsapp_opened",
    entity_type: "contact",
    entity_id: contact.id,
    metadata: { channel: "whatsapp_official_manual" },
  });
}

export async function updateContactAction(
  contactId: string,
  _prevState: UpdateContactActionState,
  formData: FormData
): Promise<UpdateContactActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const interestIds = formData
    .getAll("interestIds")
    .map((v) => String(v))
    .filter(Boolean);

  const parsed = updateContactSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    email: formData.get("email") ?? "",
    city: formData.get("city") ?? "",
    neighborhood: formData.get("neighborhood") ?? "",
    birthDay: formData.get("birthDay"),
    birthMonth: formData.get("birthMonth"),
    interestIds,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Revise os campos antes de salvar.",
      success: null,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("contacts")
    .update({
      full_name: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp || null,
      email: parsed.data.email || null,
      city: parsed.data.city,
      neighborhood: parsed.data.neighborhood || null,
      birth_day: parsed.data.birthDay,
      birth_month: parsed.data.birthMonth,
    })
    .eq("id", contactId)
    .select("id, tenant_id, data_scope")
    .maybeSingle();

  if (updateError || !updated) {
    return {
      error: "Não foi possível atualizar os dados deste apoiador.",
      success: null,
    };
  }

  // Sincroniza interesses dentro do mesmo tenant e data_scope
  await supabase
    .from("contact_interests")
    .delete()
    .eq("contact_id", updated.id)
    .eq("tenant_id", updated.tenant_id);

  if (parsed.data.interestIds.length > 0) {
    await supabase.from("contact_interests").insert(
      parsed.data.interestIds.map((interestId) => ({
        tenant_id: updated.tenant_id,
        contact_id: updated.id,
        interest_id: interestId,
      }))
    );
  }

  await supabase.from("audit_logs").insert({
    tenant_id: updated.tenant_id,
    data_scope: updated.data_scope,
    actor_user_id: user.id,
    action: "contact.updated",
    entity_type: "contact",
    entity_id: updated.id,
    metadata: {
      city: parsed.data.city,
      neighborhood: parsed.data.neighborhood || null,
      interests_count: parsed.data.interestIds.length,
    },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  revalidatePath(`/painel/base/${contactId}`);

  return {
    error: null,
    success: "Ficha atualizada e registrada na auditoria.",
  };
}

export async function revokeContactConsentAction(formData: FormData) {
  if (!isSupabaseConfigured()) return;

  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const now = new Date().toISOString();

  const { data: updated } = await supabase
    .from("contacts")
    .update({
      consent_status: "revoked",
      revoked_at: now,
    })
    .eq("id", contactId)
    .eq("consent_status", "granted")
    .select("id, tenant_id, data_scope, consent_version")
    .maybeSingle();

  if (updated) {
    await Promise.all([
      supabase.from("consent_records").insert({
        tenant_id: updated.tenant_id,
        data_scope: updated.data_scope,
        contact_id: updated.id,
        action: "revoked",
        source: "painel-gabinete",
        consent_version: updated.consent_version,
        consent_text_snapshot:
          "Consentimento revogado pela assessoria a pedido do titular (LGPD).",
        recorded_at: now,
      }),
      supabase.from("audit_logs").insert({
        tenant_id: updated.tenant_id,
        data_scope: updated.data_scope,
        actor_user_id: user.id,
        action: "contact.consent_revoked_by_staff",
        entity_type: "contact",
        entity_id: updated.id,
        metadata: { source: "painel-gabinete" },
      }),
    ]);
  }

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  revalidatePath(`/painel/base/${contactId}`);
}

export async function deleteContactAction(formData: FormData) {
  if (!isSupabaseConfigured()) return;

  const contactId = String(formData.get("contactId") ?? "");
  const scope = String(formData.get("dataScope") ?? "mandate");
  if (!contactId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, tenant_id, data_scope, city")
    .eq("id", contactId)
    .maybeSingle();

  if (!contact) {
    redirect(`/painel/base?escopo=${scope}`);
  }

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contact.id);

  if (!error) {
    await supabase.from("audit_logs").insert({
      tenant_id: contact.tenant_id,
      data_scope: contact.data_scope,
      actor_user_id: user.id,
      action: "contact.deleted_lgpd",
      entity_type: "contact",
      entity_id: contact.id,
      metadata: { city: contact.city },
    });
  }

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  redirect(`/painel/base?escopo=${contact.data_scope}`);
}

export async function createAssistedContactAction(
  _prevState: ActionFeedbackState,
  formData: FormData
): Promise<ActionFeedbackState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado.", success: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const rawScope = String(formData.get("dataScope") ?? "mandate");
  const dataScope = rawScope === "campaign" ? "campaign" : "mandate";
  const rawConsent = formData.get("consentAccepted") === "on";
  const interestIds = formData
    .getAll("interestIds")
    .map((v) => String(v))
    .filter(Boolean);

  const parsed = publicRegistrationSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    email: formData.get("email") ?? "",
    city: formData.get("city") ?? "",
    neighborhood: formData.get("neighborhood") ?? "",
    birthDay: formData.get("birthDay"),
    birthMonth: formData.get("birthMonth"),
    interestIds,
    consentAccepted: rawConsent,
    consentVersion: CURRENT_CONSENT_VERSION,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Revise os campos antes de cadastrar.",
      success: null,
    };
  }

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { error: "Mandato não encontrado.", success: null };
  }

  const now = new Date().toISOString();

  const { data: created, error: insertError } = await supabase
    .from("contacts")
    .insert({
      tenant_id: membership.tenant_id,
      data_scope: dataScope,
      full_name: parsed.data.fullName,
      whatsapp: parsed.data.whatsapp || null,
      email: parsed.data.email || null,
      city: parsed.data.city,
      neighborhood: parsed.data.neighborhood || null,
      birth_day: parsed.data.birthDay,
      birth_month: parsed.data.birthMonth,
      consent_status: "granted",
      consent_source: "atendimento-presencial",
      consent_version: parsed.data.consentVersion,
      consented_at: now,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return {
      error: "Não foi possível salvar o apoiador. Tente novamente.",
      success: null,
    };
  }

  if (parsed.data.interestIds.length > 0) {
    await supabase.from("contact_interests").insert(
      parsed.data.interestIds.map((interestId) => ({
        tenant_id: membership.tenant_id,
        contact_id: created.id,
        interest_id: interestId,
      }))
    );
  }

  await Promise.all([
    supabase.from("consent_records").insert({
      tenant_id: membership.tenant_id,
      data_scope: dataScope,
      contact_id: created.id,
      action: "granted",
      source: "atendimento-presencial",
      consent_version: parsed.data.consentVersion,
      consent_text_snapshot: CONSENT_STATEMENT_PT_BR,
      recorded_at: now,
    }),
    supabase.from("audit_logs").insert({
      tenant_id: membership.tenant_id,
      data_scope: dataScope,
      actor_user_id: user.id,
      action: "contact.assisted_registered",
      entity_type: "contact",
      entity_id: created.id,
      metadata: {
        consent_source: "atendimento-presencial",
        consent_version: parsed.data.consentVersion,
      },
    }),
  ]);

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  redirect(`/painel/base/${created.id}`);
}
