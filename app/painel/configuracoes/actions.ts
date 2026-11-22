"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { TenantRole } from "@/lib/types/database";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  isValidHexColor,
} from "@/lib/utils/branding";

export interface SettingsActionState {
  error: string | null;
  success: string | null;
  inviteLink?: string;
}

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .refine(
    (v) => v === null || /^https?:\/\//i.test(v),
    "Informe uma URL válida começando com https:// ou http://."
  );

const tenantDetailsSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da organização.").max(100),
  publicDisplayName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),
  organizationType: z.enum(["mandate", "pre_campaign", "campaign", "other"]),
  officeTitle: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  city: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "UF deve ter 2 letras."),
  bio: z
    .string()
    .trim()
    .max(240)
    .optional()
    .transform((v) => v || null),
  instagram: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || undefined),
  website: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => v || undefined),
});

const brandingSchema = z.object({
  primaryColor: z
    .string()
    .trim()
    .refine(isValidHexColor, "Cor principal inválida (use formato #RRGGBB)."),
  accentColor: z
    .string()
    .trim()
    .refine(isValidHexColor, "Cor de destaque inválida (use formato #RRGGBB)."),
  logoUrl: optionalUrl,
  avatarUrl: optionalUrl,
});

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  role: z.enum(["admin", "advisor", "viewer"]),
});

async function requireTenantWithRole(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  tenantId: string;
  role: TenantRole;
} | null> {
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

  if (!membership) return null;

  return {
    supabase,
    userId: user.id,
    tenantId: membership.tenant_id as string,
    role: membership.role as TenantRole,
  };
}

export async function updateTenantDetailsAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  void _prevState;
  const auth = await requireTenantWithRole();
  if (!auth) return { error: "Mandato não encontrado.", success: null };

  if (!hasPermission(auth.role, "branding:manage")) {
    return {
      error: "Sem permissão para alterar os dados do mandato.",
      success: null,
    };
  }

  const parsed = tenantDetailsSchema.safeParse({
    name: formData.get("name") ?? "",
    publicDisplayName: formData.get("publicDisplayName") ?? "",
    organizationType: formData.get("organizationType") ?? "mandate",
    officeTitle: formData.get("officeTitle") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    bio: formData.get("bio") ?? "",
    instagram: formData.get("socialInstagram") ?? "",
    website: formData.get("socialWebsite") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: null,
    };
  }

  const socialLinks: Record<string, string> = {};
  if (parsed.data.instagram) socialLinks.instagram = parsed.data.instagram;
  if (parsed.data.website) socialLinks.website = parsed.data.website;

  const { error } = await auth.supabase
    .from("tenants")
    .update({
      name: parsed.data.name,
      public_display_name: parsed.data.publicDisplayName,
      organization_type: parsed.data.organizationType,
      office_title: parsed.data.officeTitle,
      city: parsed.data.city,
      state: parsed.data.state,
      bio: parsed.data.bio,
      social_links: socialLinks,
    })
    .eq("id", auth.tenantId);

  if (error) {
    const missingSchema =
      error.code === "42703" || error.code === "PGRST204";
    return {
      error: missingSchema
        ? "Colunas novas ainda não existem no banco. Execute a migração 0005_profiles_tenant_branding_and_roles.sql no SQL Editor do Supabase."
        : `Não foi possível salvar os dados do mandato (${error.message}).`,
      success: null,
    };
  }

  await auth.supabase.from("audit_logs").insert({
    tenant_id: auth.tenantId,
    data_scope: "mandate",
    actor_user_id: auth.userId,
    action: "tenant.details_updated",
    entity_type: "tenant",
    entity_id: auth.tenantId,
    metadata: {
      name: parsed.data.name,
      organization_type: parsed.data.organizationType,
    },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/configuracoes");

  return { error: null, success: "Dados do mandato atualizados." };
}

export async function updateTenantBrandingAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  void _prevState;
  const auth = await requireTenantWithRole();
  if (!auth) return { error: "Mandato não encontrado.", success: null };

  if (!hasPermission(auth.role, "branding:manage")) {
    return {
      error: "Sem permissão para alterar a identidade visual.",
      success: null,
    };
  }

  const restoreDefault = formData.get("restoreDefault") === "true";

  const payload = restoreDefault
    ? {
        primaryColor: DEFAULT_PRIMARY_COLOR,
        accentColor: DEFAULT_ACCENT_COLOR,
        logoUrl: null,
        avatarUrl: null,
      }
    : {
        primaryColor: String(formData.get("primaryColor") ?? DEFAULT_PRIMARY_COLOR),
        accentColor: String(formData.get("accentColor") ?? DEFAULT_ACCENT_COLOR),
        logoUrl: String(formData.get("logoUrl") ?? ""),
        avatarUrl: String(formData.get("avatarUrl") ?? ""),
      };

  const parsed = brandingSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Cores ou URLs inválidas.",
      success: null,
    };
  }

  const { error } = await auth.supabase
    .from("tenants")
    .update({
      primary_color: parsed.data.primaryColor.toUpperCase(),
      accent_color: parsed.data.accentColor.toUpperCase(),
      logo_url: parsed.data.logoUrl,
      avatar_url: parsed.data.avatarUrl,
    })
    .eq("id", auth.tenantId);

  if (error) {
    const missingSchema =
      error.code === "42703" || error.code === "PGRST204";
    return {
      error: missingSchema
        ? "Colunas de identidade visual ainda não existem no banco. Execute a migração 0005_profiles_tenant_branding_and_roles.sql no SQL Editor do Supabase."
        : `Não foi possível atualizar a identidade visual (${error.message}).`,
      success: null,
    };
  }

  await auth.supabase.from("audit_logs").insert({
    tenant_id: auth.tenantId,
    data_scope: "mandate",
    actor_user_id: auth.userId,
    action: restoreDefault ? "tenant.branding_reset" : "tenant.branding_updated",
    entity_type: "tenant",
    entity_id: auth.tenantId,
    metadata: {
      primary_color: parsed.data.primaryColor.toUpperCase(),
      accent_color: parsed.data.accentColor.toUpperCase(),
    },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/base");
  revalidatePath("/painel/links");
  revalidatePath("/painel/configuracoes");

  return {
    error: null,
    success: restoreDefault
      ? "Identidade visual restaurada para o padrão."
      : "Identidade visual atualizada.",
  };
}

export async function inviteTeamMemberAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  void _prevState;
  const auth = await requireTenantWithRole();
  if (!auth) return { error: "Mandato não encontrado.", success: null };

  if (!hasPermission(auth.role, "team:manage")) {
    return { error: "Sem permissão para convidar membros.", success: null };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email") ?? "",
    role: formData.get("role") ?? "advisor",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados do convite inválidos.",
      success: null,
    };
  }

  const { data: created, error } = await auth.supabase
    .from("tenant_invitations")
    .insert({
      tenant_id: auth.tenantId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: auth.userId,
    })
    .select("id, token")
    .single();

  if (error || !created) {
    return {
      error:
        "Não foi possível gerar o convite. Confirme se a migração 0005 foi aplicada.",
      success: null,
    };
  }

  await auth.supabase.from("audit_logs").insert({
    tenant_id: auth.tenantId,
    data_scope: "mandate",
    actor_user_id: auth.userId,
    action: "team.member_invited",
    entity_type: "tenant_invitation",
    entity_id: created.id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/painel/configuracoes");

  return {
    error: null,
    success: "Convite criado. Compartilhe o link abaixo com o convidado:",
    inviteLink: `/convite/${created.token}`,
  };
}

export async function updateMemberRoleAction(formData: FormData) {
  const auth = await requireTenantWithRole();
  if (!auth || !hasPermission(auth.role, "team:manage")) return;

  const memberId = String(formData.get("memberId") ?? "");
  const nextRole = String(formData.get("role") ?? "");
  if (!memberId || !["admin", "advisor", "viewer"].includes(nextRole)) return;

  const { data: target } = await auth.supabase
    .from("tenant_members")
    .select("id, role, user_id")
    .eq("id", memberId)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  if (!target || target.role === "owner") return;

  await auth.supabase
    .from("tenant_members")
    .update({ role: nextRole })
    .eq("id", target.id)
    .eq("tenant_id", auth.tenantId);

  await auth.supabase.from("audit_logs").insert({
    tenant_id: auth.tenantId,
    data_scope: "mandate",
    actor_user_id: auth.userId,
    action: "team.role_updated",
    entity_type: "tenant_member",
    entity_id: target.id,
    metadata: { previous_role: target.role, new_role: nextRole },
  });

  revalidatePath("/painel/configuracoes");
}

export async function removeTeamMemberAction(formData: FormData) {
  const auth = await requireTenantWithRole();
  if (!auth || !hasPermission(auth.role, "team:manage")) return;

  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return;

  const { data: target } = await auth.supabase
    .from("tenant_members")
    .select("id, role, user_id")
    .eq("id", memberId)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  if (!target || target.role === "owner" || target.user_id === auth.userId) {
    return;
  }

  await auth.supabase
    .from("tenant_members")
    .delete()
    .eq("id", target.id)
    .eq("tenant_id", auth.tenantId);

  await auth.supabase.from("audit_logs").insert({
    tenant_id: auth.tenantId,
    data_scope: "mandate",
    actor_user_id: auth.userId,
    action: "team.member_removed",
    entity_type: "tenant_member",
    entity_id: target.id,
    metadata: { removed_role: target.role },
  });

  revalidatePath("/painel/configuracoes");
}

export async function revokeInvitationAction(formData: FormData) {
  const auth = await requireTenantWithRole();
  if (!auth || !hasPermission(auth.role, "team:manage")) return;

  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) return;

  await auth.supabase
    .from("tenant_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("tenant_id", auth.tenantId);

  revalidatePath("/painel/configuracoes");
}
