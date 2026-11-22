import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { DataScope } from "@/lib/types/database";
import {
  buildSupportersCsv,
  type ExportableSupporterRow,
} from "@/lib/utils/csv";

interface RawContactExportRow {
  full_name: string;
  whatsapp: string | null;
  email: string | null;
  city: string;
  neighborhood: string | null;
  birth_day: number | null;
  birth_month: number | null;
  consent_source: string;
  consent_version: string;
  consented_at: string;
  contact_interests?: Array<{
    interests: { name: string } | null;
  }>;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rawScope = request.nextUrl.searchParams.get("escopo");
  const dataScope: DataScope = rawScope === "campaign" ? "campaign" : "mandate";

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "Apenas administradores do mandato podem exportar a base." },
      { status: 403 }
    );
  }

  const { data: rows, error } = await supabase
    .from("contacts")
    .select(
      "full_name, whatsapp, email, city, neighborhood, birth_day, birth_month, consent_source, consent_version, consented_at, contact_interests(interests(name))"
    )
    .eq("tenant_id", membership.tenant_id)
    .eq("data_scope", dataScope)
    .eq("consent_status", "granted")
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Erro ao consultar contatos para exportação." },
      { status: 500 }
    );
  }

  const typedRows = (rows as unknown as RawContactExportRow[] | null) ?? [];
  const exportRows: ExportableSupporterRow[] = typedRows.map((row) => ({
    full_name: row.full_name,
    whatsapp: row.whatsapp,
    email: row.email,
    city: row.city,
    neighborhood: row.neighborhood,
    birth_day: row.birth_day,
    birth_month: row.birth_month,
    consent_source: row.consent_source,
    consent_version: row.consent_version,
    consented_at: row.consented_at,
    interests: (row.contact_interests ?? [])
      .map((ci) => ci.interests?.name)
      .filter((n): n is string => Boolean(n)),
  }));

  await supabase.from("audit_logs").insert({
    tenant_id: membership.tenant_id,
    data_scope: dataScope,
    actor_user_id: user.id,
    action: "contacts.exported_csv",
    entity_type: "contact",
    entity_id: null,
    metadata: {
      exported_count: exportRows.length,
      consent_filter: "granted_only",
    },
  });

  const csvContent = buildSupportersCsv(exportRows);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `mandato-plus-${dataScope}-${dateStamp}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
