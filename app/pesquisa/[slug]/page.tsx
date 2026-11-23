import type * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicSurveyForm } from "@/components/public/public-survey-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { buildTenantThemeStyle } from "@/lib/utils/branding";
import type { SurveyCustomQuestion, SurveyStatus } from "@/lib/utils/surveys";

export const metadata: Metadata = {
  title: "Pesquisa de Percepção | Mandato+",
  description:
    "Sua opinião ajuda a melhorar nossa cidade. Participação voluntária e opção anônima.",
};

interface PublicSurveyDetails {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  intro_text: string | null;
  thank_you_text: string | null;
  status: SurveyStatus;
  starts_at: string | null;
  ends_at: string | null;
  response_limit: number | null;
  total_responses: number;
  use_default_questions: boolean;
  custom_questions: SurveyCustomQuestion[];
  tenant_slug: string;
  tenant_display_name: string;
  office_title: string | null;
  tenant_city: string | null;
  tenant_state: string | null;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  public_registration_slug: string | null;
}

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let survey: PublicSurveyDetails | null = null;
  const supabaseReady = isSupabaseConfigured();

  if (supabaseReady) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_public_survey", {
      p_slug: slug,
    });
    if (data) survey = data as PublicSurveyDetails;
  }

  const themeStyle = buildTenantThemeStyle(
    survey?.primary_color,
    survey?.accent_color
  );

  const now = new Date();
  const isAvailable =
    Boolean(survey) &&
    survey!.status === "active" &&
    (!survey!.starts_at || now >= new Date(survey!.starts_at)) &&
    (!survey!.ends_at || now <= new Date(survey!.ends_at)) &&
    (survey!.response_limit === null ||
      survey!.total_responses < survey!.response_limit);

  return (
    <div
      style={themeStyle as React.CSSProperties}
      className="flex min-h-screen flex-col bg-canvas"
    >
      <header className="border-b border-border-subtle bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-brand-navy"
          >
            {survey ? (
              survey.tenant_display_name
            ) : (
              <>
                Mandato<span className="text-brand-emerald">+</span>
              </>
            )}
          </Link>
          <span className="text-xs text-ink-muted">Pesquisa de percepção</span>
        </div>
      </header>

      <main
        id="conteudo-principal"
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12"
      >
        {!supabaseReady || !survey ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-6">
            <h1 className="text-lg font-semibold text-ink-primary">
              Pesquisa não encontrada
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Verifique o link informado ou consulte o gabinete responsável.
            </p>
          </div>
        ) : !isAvailable ? (
          <div className="rounded-2xl border border-border-subtle bg-white p-6">
            <h1 className="text-lg font-semibold text-ink-primary">
              Pesquisa encerrada ou pausada
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary">
              Esta pesquisa de {survey.tenant_display_name} não está recebendo
              novas respostas no momento.
            </p>
            <div className="mt-4">
              <Link
                href={`/transparencia/${survey.tenant_slug}`}
                className="text-xs font-medium text-brand-navy underline"
              >
                Ver página de transparência do mandato
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8">
            <div className="mb-6 border-b border-border-subtle pb-5">
              <p className="text-xs font-medium text-ink-muted">
                {[
                  survey.tenant_display_name,
                  survey.office_title,
                  survey.tenant_city
                    ? `${survey.tenant_city}${
                        survey.tenant_state ? `/${survey.tenant_state}` : ""
                      }`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary">
                {survey.title || "Sua opinião ajuda a melhorar nossa cidade"}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                {survey.intro_text ||
                  "Responda em menos de 2 minutos. Sua participação é voluntária e suas respostas serão usadas apenas para melhorar o atendimento e as ações do mandato."}
              </p>
            </div>

            <PublicSurveyForm
              slug={survey.slug}
              tenantDisplayName={survey.tenant_display_name}
              tenantSlug={survey.tenant_slug}
              publicRegistrationSlug={survey.public_registration_slug}
              useDefaultQuestions={survey.use_default_questions}
              customQuestions={survey.custom_questions ?? []}
              thankYouText={survey.thank_you_text}
              defaultCity={survey.tenant_city}
            />
          </div>
        )}
      </main>
    </div>
  );
}
