"use server";

import { headers } from "next/headers";
import {
  CONSENT_STATEMENT_PT_BR,
  CURRENT_CONSENT_VERSION,
} from "@/lib/constants/consent";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { checkPublicRateLimit, hashClientIp } from "@/lib/utils/security";
import { publicRegistrationSchema } from "@/lib/validation/public-registration";

export interface PublicRegistrationActionState {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success: boolean;
  unsubscribeToken?: string;
  consentedAt?: string;
}

export async function submitPublicRegistrationAction(
  slug: string,
  _prevState: PublicRegistrationActionState,
  formData: FormData
): Promise<PublicRegistrationActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return {
      error: "Serviço temporariamente indisponível (Supabase não configurado).",
      success: false,
    };
  }

  // Honeypot invisível contra preenchimento automatizado (bots)
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot.length > 0) {
    return {
      error: "Não foi possível validar sua solicitação. Tente novamente.",
      success: false,
    };
  }

  const requestHeaders = await headers();
  const ipHash = hashClientIp(
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip")
  );
  const rateKey = `reg:${slug}:${ipHash ?? "anon"}`;
  if (!checkPublicRateLimit(rateKey)) {
    return {
      error:
        "Muitas tentativas em sequência. Aguarde um minuto e tente novamente.",
      success: false,
    };
  }

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
    instagramHandle: formData.get("instagramHandle") ?? "",
    birthDay: formData.get("birthDay"),
    birthMonth: formData.get("birthMonth"),
    interestIds,
    consentAccepted: rawConsent,
    consentVersion: CURRENT_CONSENT_VERSION,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }

    return {
      error:
        parsed.error.issues[0]?.message ??
        "Revise os campos destacados antes de enviar.",
      fieldErrors,
      success: false,
    };
  }

  const userAgent = requestHeaders.get("user-agent")?.slice(0, 255) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_public_supporter", {
    p_slug: slug,
    p_full_name: parsed.data.fullName,
    p_whatsapp: parsed.data.whatsapp || null,
    p_email: parsed.data.email || null,
    p_city: parsed.data.city,
    p_neighborhood: parsed.data.neighborhood || null,
    p_birth_day: parsed.data.birthDay,
    p_birth_month: parsed.data.birthMonth,
    p_interest_ids: parsed.data.interestIds,
    p_consent_accepted: parsed.data.consentAccepted,
    p_consent_source: `link-publico:${slug}`,
    p_consent_version: parsed.data.consentVersion,
    p_consent_text_snapshot: CONSENT_STATEMENT_PT_BR,
    p_ip_hash: ipHash,
    p_user_agent: userAgent,
    p_instagram_handle: parsed.data.instagramHandle || null,
  });

  if (error || !data) {
    return {
      error:
        error?.message ??
        "Não foi possível concluir seu cadastro agora. Tente novamente em instantes.",
      success: false,
    };
  }

  const payload = data as {
    unsubscribe_token?: string;
    consented_at?: string;
  };

  return {
    error: null,
    success: true,
    unsubscribeToken: payload.unsubscribe_token,
    consentedAt: payload.consented_at,
  };
}
