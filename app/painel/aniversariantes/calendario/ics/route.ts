import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getInitials,
  getTenantDisplayName,
  loadAuthenticatedMembership,
} from "@/lib/supabase/panel-data";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types/database";
import {
  buildBirthdayCalendarIcs,
  type BirthdayCalendarContact,
} from "@/lib/utils/birthday-calendar";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const rawScope = url.searchParams.get("escopo") ?? "mandate";
  const rawMonth = Number(url.searchParams.get("mes"));
  const rawYear = Number(url.searchParams.get("ano"));

  const ctx = await loadAuthenticatedMembership(rawScope);
  if (!ctx.tenant || !hasPermission(ctx.role, "exports:manage")) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const year =
    Number.isInteger(rawYear) && rawYear >= 2020 && rawYear <= 2100
      ? rawYear
      : new Date().getUTCFullYear();
  const monthFilter =
    Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth
      : null;

  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("id, full_name, city, neighborhood, birth_day, birth_month")
    .eq("tenant_id", ctx.tenant.id)
    .eq("data_scope", ctx.activeScope)
    .eq("consent_status", "granted")
    .not("birth_day", "is", null)
    .not("birth_month", "is", null);

  if (monthFilter !== null) {
    query = query.eq("birth_month", monthFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "Erro ao gerar calendário." },
      { status: 500 }
    );
  }

  const rows = (data as Contact[] | null) ?? [];
  const contacts: BirthdayCalendarContact[] = rows
    .filter(
      (c): c is Contact & { birth_day: number; birth_month: number } =>
        c.birth_day !== null && c.birth_month !== null
    )
    .map((c) => ({
      id: c.id,
      fullName: c.full_name,
      initials: getInitials(c.full_name),
      city: c.city,
      neighborhood: c.neighborhood,
      birthDay: c.birth_day,
      birthMonth: c.birth_month,
      whatsappUrl: null,
    }));

  const ics = buildBirthdayCalendarIcs(
    contacts,
    year,
    getTenantDisplayName(ctx.tenant)
  );

  await supabase.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.userId,
    action: "birthdays_calendar.exported_ics",
    entity_type: "contact",
    entity_id: null,
    metadata: {
      data_scope: ctx.activeScope,
      year,
      month: monthFilter,
      total_events: contacts.length,
    },
  });

  const periodTag = monthFilter
    ? `${year}-${String(monthFilter).padStart(2, "0")}`
    : `${year}`;

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="aniversarios-${periodTag}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
