"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { CURRENT_CONSENT_VERSION } from "@/lib/constants/consent";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { checkPublicRateLimit, hashClientIp } from "@/lib/utils/security";
import {
  publicSurveyResponseSchema,
  SURVEY_COMMUNICATION_CONSENT_TEXT,
} from "@/lib/utils/surveys";

export interface SubmitSurveyActionState {
  error: string | null;
  success: boolean;
  unsubscribeToken?: string | null;
}

export async function submitPublicSurveyAction(
  slug: string,
  _prevState: SubmitSurveyActionState,
  formData: FormData
): Promise<SubmitSurveyActionState> {
  void _prevState;

  if (!isSupabaseConfigured()) {
    return {
      error: "Serviço temporariamente indisponível.",
      success: false,
    };
  }

  // Honeypot anti-bot
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot.length > 0) {
    return {
      error: "Não foi possível validar sua resposta.",
      success: false,
    };
  }

  const requestHeaders = await headers();
  const ipHash = hashClientIp(
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip")
  );
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 255) ?? "";

  if (!checkPublicRateLimit(`survey:${slug}:${ipHash ?? "anon"}`)) {
    return {
      error:
        "Muitas tentativas em sequência. Aguarde um minuto e tente novamente.",
      success: false,
    };
  }

  const clientDeviceToken = String(formData.get("deviceToken") ?? "").trim();
  const deviceSecret =
    process.env.IP_HASH_SECRET ?? "mandato-plus-dev-ip-salt";
  const deviceHash = clientDeviceToken
    ? createHmac("sha256", deviceSecret)
        .update(`${slug}:${clientDeviceToken}`)
        .digest("hex")
    : ipHash;

  const isAnonymous = String(formData.get("identificationMode") ?? "anonymous") !== "identified";
  const wantsUpdates = String(formData.get("wantsUpdates") ?? "no") === "yes";
  const communicationConsentGranted =
    formData.get("communicationConsent") === "on";

  const strengthAreas = formData
    .getAll("strengthAreas")
    .map((v) => String(v))
    .filter(Boolean);
  const improvementAreas = formData
    .getAll("improvementAreas")
    .map((v) => String(v))
    .filter(Boolean);

  // Coleta respostas de perguntas personalizadas (prefixo custom_)
  const customAnswers: Record<string, string | string[]> = {};
  for (const [key] of formData.entries()) {
    if (key.startsWith("custom_")) {
      const qId = key.slice("custom_".length);
      const values = formData
        .getAll(key)
        .map((v) => String(v).trim())
        .filter(Boolean);
      if (values.length === 1) customAnswers[qId] = values[0];
      else if (values.length > 1) customAnswers[qId] = values;
    }
  }

  const parsed = publicSurveyResponseSchema.safeParse({
    isAnonymous,
    city: formData.get("city") ?? "",
    neighborhood: formData.get("neighborhood") ?? "",
    managementRating: formData.get("managementRating") ?? "",
    mandateRating: formData.get("mandateRating") ?? "",
    strengthAreas,
    improvementAreas,
    mainNeighborhoodNeed: formData.get("mainNeighborhoodNeed") ?? "",
    mostValuedAction: formData.get("mostValuedAction") ?? "",
    whatToImprove: formData.get("whatToImprove") ?? "",
    customAnswers,
    wantsUpdates,
    communicationConsentGranted,
    respondentName: isAnonymous ? "" : (formData.get("respondentName") ?? ""),
    respondentWhatsapp: isAnonymous
      ? ""
      : (formData.get("respondentWhatsapp") ??
          formData.get("updatesWhatsapp") ??
          ""),
    respondentEmail: isAnonymous ? "" : (formData.get("respondentEmail") ?? ""),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Revise suas respostas antes de enviar.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_public_survey_response", {
    p_slug: slug,
    p_is_anonymous: parsed.data.isAnonymous,
    p_city: parsed.data.city,
    p_neighborhood: parsed.data.neighborhood,
    p_management_rating: parsed.data.managementRating,
    p_mandate_rating: parsed.data.mandateRating,
    p_strength_areas: parsed.data.strengthAreas,
    p_improvement_areas: parsed.data.improvementAreas,
    p_main_neighborhood_need: parsed.data.mainNeighborhoodNeed,
    p_most_valued_action: parsed.data.mostValuedAction,
    p_what_to_improve: parsed.data.whatToImprove,
    p_custom_answers: parsed.data.customAnswers,
    p_wants_updates: parsed.data.wantsUpdates,
    p_communication_consent_granted: parsed.data.communicationConsentGranted,
    p_communication_consent_version: CURRENT_CONSENT_VERSION,
    p_communication_consent_text: SURVEY_COMMUNICATION_CONSENT_TEXT,
    p_respondent_name: parsed.data.respondentName,
    p_respondent_whatsapp: parsed.data.respondentWhatsapp,
    p_respondent_email: parsed.data.respondentEmail,
    p_ip_hash: ipHash,
    p_device_hash: deviceHash,
    p_user_agent: userAgent || null,
  });

  if (error) {
    return {
      error:
        error.message ||
        "Não foi possível registrar sua resposta no momento.",
      success: false,
    };
  }

  const payload = (data ?? {}) as { unsubscribe_token?: string | null };

  return {
    error: null,
    success: true,
    unsubscribeToken: payload.unsubscribe_token ?? null,
  };
}
