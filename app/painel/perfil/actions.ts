"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface ProfileActionState {
  error: string | null;
  success: string | null;
}

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(120, "Máximo de 120 caracteres."),
  phone: z
    .string()
    .trim()
    .max(30, "Telefone muito longo.")
    .optional()
    .transform((v) => v || null),
  teamRoleLabel: z
    .string()
    .trim()
    .max(80, "Função pode ter no máximo 80 caracteres.")
    .optional()
    .transform((v) => v || null),
  avatarUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine(
      (v) => v === null || /^https?:\/\//i.test(v),
      "Informe uma URL válida começando com https:// ou http://."
    ),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas informadas não coincidem.",
    path: ["confirmPassword"],
  });

export async function updateUserProfileAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
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

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    teamRoleLabel: formData.get("teamRoleLabel") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: null,
    };
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      team_role_label: parsed.data.teamRoleLabel,
      avatar_url: parsed.data.avatarUrl,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return {
      error:
        "Não foi possível salvar seu perfil. Confirme se a migração 0005 foi aplicada.",
      success: null,
    };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/perfil");

  return { error: null, success: "Perfil pessoal atualizado." };
}

export async function updatePasswordAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
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

  const parsed = passwordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Senha inválida.",
      success: null,
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: "Não foi possível alterar sua senha agora. Tente novamente.",
      success: null,
    };
  }

  return { error: null, success: "Senha atualizada com sucesso." };
}
