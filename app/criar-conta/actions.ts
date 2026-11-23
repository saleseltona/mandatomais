"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  sanitizeHexColor,
} from "@/lib/utils/branding";

export interface SignupActionState {
  error: string | null;
  needsEmailConfirmation?: boolean;
  registeredEmail?: string;
}

const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(120, "Nome muito longo."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(72, "Senha muito longa."),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => v || null),
  teamRoleLabel: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  orgName: z
    .string()
    .trim()
    .min(2, "Informe o nome do mandato ou organização.")
    .max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "O identificador deve ter pelo menos 3 caracteres.")
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Identificador inválido: use apenas letras minúsculas, números e hífen."
    ),
  organizationType: z
    .enum(["mandate", "pre_campaign", "campaign", "other"])
    .default("mandate"),
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
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Informe a UF com 2 letras."),
  instagram: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => v || null),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
});

export async function signUpWithProfileAction(
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return {
      error: "Supabase não configurado em .env.local.",
    };
  }

  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    phone: formData.get("phone") ?? "",
    teamRoleLabel: formData.get("teamRoleLabel") ?? "",
    orgName: formData.get("orgName") ?? "",
    slug: formData.get("slug") ?? "",
    organizationType: formData.get("organizationType") ?? "mandate",
    officeTitle: formData.get("officeTitle") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    instagram: formData.get("instagram") ?? "",
    primaryColor: formData.get("primaryColor") ?? DEFAULT_PRIMARY_COLOR,
    accentColor: formData.get("accentColor") ?? DEFAULT_ACCENT_COLOR,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revise os dados informados.",
    };
  }

  const supabase = await createClient();
  const primaryColor = sanitizeHexColor(
    parsed.data.primaryColor,
    DEFAULT_PRIMARY_COLOR
  );
  const accentColor = sanitizeHexColor(
    parsed.data.accentColor,
    DEFAULT_ACCENT_COLOR
  );

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        team_role_label: parsed.data.teamRoleLabel,
        pending_onboarding: {
          org_name: parsed.data.orgName,
          slug: parsed.data.slug,
          organization_type: parsed.data.organizationType,
          office_title: parsed.data.officeTitle,
          city: parsed.data.city,
          state: parsed.data.state,
          instagram: parsed.data.instagram,
          primary_color: primaryColor,
          accent_color: accentColor,
        },
      },
    },
  });

  if (signUpError) {
    return {
      error:
        signUpError.message === "User already registered"
          ? "Este e-mail já possui conta. Faça login em Entrar."
          : "Não foi possível criar a conta. Verifique o e-mail e tente novamente.",
    };
  }

  // Se o projeto Supabase exige confirmação por e-mail, não há sessão ativa ainda.
  // Os dados do mandato já foram salvos em user_metadata.pending_onboarding e serão
  // concluídos automaticamente no primeiro acesso após a confirmação do e-mail.
  if (!signUpData.session || !signUpData.user) {
    return {
      error: null,
      needsEmailConfirmation: true,
      registeredEmail: parsed.data.email,
    };
  }

  // Sessão ativa: grava perfil pessoal e inicializa o mandato imediatamente
  await supabase.from("user_profiles").upsert(
    {
      user_id: signUpData.user.id,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      team_role_label: parsed.data.teamRoleLabel,
    },
    { onConflict: "user_id" }
  );

  const { error: tenantError } = await supabase.rpc("bootstrap_first_tenant", {
    p_name: parsed.data.orgName,
    p_slug: parsed.data.slug,
    p_office_title: parsed.data.officeTitle,
    p_city: parsed.data.city,
    p_state: parsed.data.state,
    p_public_display_name: parsed.data.orgName,
    p_organization_type: parsed.data.organizationType,
    p_bio: null,
    p_primary_color: primaryColor,
    p_accent_color: accentColor,
    p_logo_url: null,
    p_avatar_url: null,
    p_social_links: parsed.data.instagram
      ? { instagram: parsed.data.instagram }
      : {},
  });

  if (tenantError && tenantError.code !== "P0004") {
    // Conta já foi criada; usuário pode concluir ou ajustar o slug no painel
    redirect("/painel");
  }

  redirect("/painel");
}
