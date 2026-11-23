import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadAuthenticatedMembership } from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import {
  buildSurveyResponsesCsv,
  type SurveyResponseRecord,
} from "@/lib/utils/surveys";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const ctx = await loadAuthenticatedMembership();

  if (!ctx.tenant || !hasPermission(ctx.role, "contacts:view")) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, slug, title")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();

  if (!survey) {
    return NextResponse.json(
      { error: "Pesquisa não encontrada." },
      { status: 404 }
    );
  }

  const { data: responses, error } = await supabase
    .from("survey_responses")
    .select("*")
    .eq("survey_id", survey.id)
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Erro ao consultar respostas da pesquisa." },
      { status: 500 }
    );
  }

  // Perfil "viewer" (sem exports:manage) recebe apenas dados anonimizados.
  const includeIdentifiable = hasPermission(ctx.role, "exports:manage");
  const rows = (responses ?? []) as SurveyResponseRecord[];
  const csv = buildSurveyResponsesCsv(rows, includeIdentifiable);

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.userId,
    action: "survey_responses.exported_csv",
    entity_type: "survey",
    entity_id: survey.id,
    metadata: {
      total_rows: rows.length,
      include_identifiable: includeIdentifiable,
    },
  });

  const safeSlug = survey.slug.replace(/[^a-z0-9-]/gi, "");
  const dateTag = new Date().toISOString().slice(0, 10);
  const filename = `pesquisa-${safeSlug}-${dateTag}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
