"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { hashClientIp } from "@/lib/utils/security";

export interface UnsubscribeActionState {
  error: string | null;
  revoked: boolean;
  revokedAt?: string;
}

const uuidSchema = z.string().uuid();

export async function confirmUnsubscribeAction(
  token: string,
  prevState: UnsubscribeActionState
): Promise<UnsubscribeActionState> {
  void prevState;

  if (!isSupabaseConfigured()) {
    return {
      error: "Serviço temporariamente indisponível (Supabase não configurado).",
      revoked: false,
    };
  }

  if (!uuidSchema.safeParse(token).success) {
    return {
      error: "Link de descadastro inválido.",
      revoked: false,
    };
  }

  const requestHeaders = await headers();
  const ipHash = hashClientIp(
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip")
  );
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 255) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revoke_supporter_consent", {
    p_token: token,
    p_ip_hash: ipHash,
    p_user_agent: userAgent,
  });

  if (error || !data) {
    return {
      error:
        "Não foi possível concluir o descadastro neste momento. Tente novamente.",
      revoked: false,
    };
  }

  const result = data as {
    found?: boolean;
    revoked_at?: string;
  };

  if (!result.found) {
    return {
      error: "Registro de consentimento não encontrado para este link.",
      revoked: false,
    };
  }

  return {
    error: null,
    revoked: true,
    revokedAt: result.revoked_at,
  };
}
