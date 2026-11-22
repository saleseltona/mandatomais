"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export interface AcceptInviteState {
  error: string | null;
}

const uuidSchema = z.string().uuid();

export async function acceptInvitationAction(
  token: string,
  prevState: AcceptInviteState
): Promise<AcceptInviteState> {
  void prevState;

  if (!isSupabaseConfigured()) {
    return { error: "Supabase não configurado." };
  }

  if (!uuidSchema.safeParse(token).success) {
    return { error: "Link de convite inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?proximo=/convite/${token}`);
  }

  const { error } = await supabase.rpc("accept_tenant_invitation", {
    p_token: token,
  });

  if (error) {
    return {
      error:
        error.message ||
        "Não foi possível aceitar este convite. Verifique se está conectado com o e-mail convidado.",
    };
  }

  redirect("/painel");
}
