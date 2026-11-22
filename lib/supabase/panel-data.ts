import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type {
  ConsentRecord,
  Contact,
  DataScope,
  Demand,
  Interest,
  PublicLink,
  Tenant,
  TenantRole,
  UserProfile,
} from "@/lib/types/database";
import { getTodayInBrazil } from "@/lib/utils/whatsapp";

export const ACTIVE_TENANT_COOKIE = "mandato_active_tenant_id";

interface MembershipRow {
  tenant_id: string;
  role: TenantRole;
  tenants: Tenant | null;
}

export interface UserTenantSummary {
  tenant_id: string;
  role: TenantRole;
  tenant: Tenant;
}

export interface ContactWithInterests extends Contact {
  contact_interests?: Array<{
    interest_id: string;
    interests: { id: string; name: string } | null;
  }>;
}

export interface PanelBaseContext {
  userId: string;
  userEmail: string;
  userProfile: UserProfile | null;
  tenant: Tenant | null;
  allMemberships: UserTenantSummary[];
  role: TenantRole | null;
  canEditContacts: boolean;
  canDeleteContacts: boolean;
  canManageLinks: boolean;
  canManageBranding: boolean;
  canManageTeam: boolean;
  canManageImports: boolean;
  canExportData: boolean;
  canManageIntegrations: boolean;
  canViewAudit: boolean;
  activeScope: DataScope;
}

export interface PanelSummaryData extends PanelBaseContext {
  activeContactsCount: number;
  todaysBirthdays: Contact[];
  recentDemands: Demand[];
  links: PublicLink[];
  interests: Interest[];
}

export interface PaginatedBaseData extends PanelBaseContext {
  activeContactsCount: number;
  todaysBirthdaysCount: number;
  totalScopeContacts: number;
  totalFiltered: number;
  page: number;
  pageSize: number;
  totalPages: number;
  contacts: ContactWithInterests[];
  interests: Interest[];
  cityCounts: Array<[string, number]>;
  neighborhoods: string[];
}

export interface ContactDetailData extends PanelBaseContext {
  contact: ContactWithInterests | null;
  scopeInterests: Interest[];
  consentRecords: ConsentRecord[];
  todaysBirthdaysCount: number;
}

export function getTenantDisplayName(tenant: Tenant | null): string {
  if (!tenant) return "Mandato+";
  const display = tenant.public_display_name?.trim();
  return display && display.length > 0 ? display : tenant.name;
}

export async function loadAuthenticatedMembership(
  rawScope?: string
): Promise<PanelBaseContext> {
  if (!isSupabaseConfigured()) {
    redirect("/entrar");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const activeScope: DataScope =
    rawScope === "campaign" ? "campaign" : "mandate";

  const [{ data: membershipRows }, { data: profileRow }] = await Promise.all([
    supabase
      .from("tenant_members")
      .select("tenant_id, role, tenants(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const typedMemberships =
    (membershipRows as unknown as MembershipRow[] | null) ?? [];

  const allMemberships: UserTenantSummary[] = typedMemberships
    .filter((m): m is MembershipRow & { tenants: Tenant } => Boolean(m.tenants))
    .map((m) => ({
      tenant_id: m.tenant_id,
      role: m.role,
      tenant: m.tenants,
    }));

  const cookieStore = await cookies();
  const preferredTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const primary =
    allMemberships.find((m) => m.tenant_id === preferredTenantId) ??
    allMemberships[0] ??
    null;
  const tenant = primary?.tenant ?? null;
  const role = primary?.role ?? null;

  return {
    userId: user.id,
    userEmail: user.email ?? "",
    userProfile: (profileRow as UserProfile | null) ?? null,
    tenant,
    allMemberships,
    role,
    canEditContacts: hasPermission(role, "contacts:edit"),
    canDeleteContacts: hasPermission(role, "contacts:delete"),
    canManageLinks: hasPermission(role, "links:manage"),
    canManageBranding: hasPermission(role, "branding:manage"),
    canManageTeam: hasPermission(role, "team:manage"),
    canManageImports: hasPermission(role, "imports:manage"),
    canExportData: hasPermission(role, "exports:manage"),
    canManageIntegrations: hasPermission(role, "integrations:manage"),
    canViewAudit: hasPermission(role, "audit:view"),
    activeScope,
  };
}

export async function loadPanelSummary(
  rawScope?: string
): Promise<PanelSummaryData> {
  const base = await loadAuthenticatedMembership(rawScope);

  if (!base.tenant) {
    return {
      ...base,
      activeContactsCount: 0,
      todaysBirthdays: [],
      recentDemands: [],
      links: [],
      interests: [],
    };
  }

  const supabase = await createClient();
  const { day: todayDay, month: todayMonth } = getTodayInBrazil();

  const [
    { count: activeCount },
    { data: birthdayRows },
    { data: demandRows },
    { data: linkRows },
    { data: interestRows },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope)
      .eq("consent_status", "granted"),
    supabase
      .from("contacts")
      .select("*")
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope)
      .eq("consent_status", "granted")
      .eq("birth_day", todayDay)
      .eq("birth_month", todayMonth)
      .order("full_name", { ascending: true }),
    supabase
      .from("demands")
      .select("*")
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope)
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("public_links")
      .select("*")
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope)
      .order("created_at", { ascending: false }),
    supabase
      .from("interests")
      .select("*")
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope)
      .order("name", { ascending: true }),
  ]);

  return {
    ...base,
    activeContactsCount: activeCount ?? 0,
    todaysBirthdays: (birthdayRows as Contact[] | null) ?? [],
    recentDemands: (demandRows as Demand[] | null) ?? [],
    links: (linkRows as PublicLink[] | null) ?? [],
    interests: (interestRows as Interest[] | null) ?? [],
  };
}

export async function loadPaginatedBase(params: {
  escopo?: string;
  cidade?: string;
  bairro?: string;
  interesse?: string;
  busca?: string;
  pagina?: string;
}): Promise<PaginatedBaseData> {
  const base = await loadAuthenticatedMembership(params.escopo);
  const pageSize = 20;
  const parsedPage = Number(params.pagina ?? "1");
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  if (!base.tenant) {
    return {
      ...base,
      activeContactsCount: 0,
      todaysBirthdaysCount: 0,
      totalScopeContacts: 0,
      totalFiltered: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      contacts: [],
      interests: [],
      cityCounts: [],
      neighborhoods: [],
    };
  }

  const supabase = await createClient();
  const { day: todayDay, month: todayMonth } = getTodayInBrazil();

  const selectedCity = params.cidade?.trim() ?? "";
  const selectedNeighborhood = params.bairro?.trim() ?? "";
  const selectedInterest = params.interesse?.trim() ?? "";
  const searchQuery = params.busca?.trim() ?? "";

  const [
    { count: activeCount },
    { count: birthdaysCount },
    { count: totalScopeCount },
    { data: interestRows },
    { data: geoSummary, error: geoRpcError },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope)
      .eq("consent_status", "granted"),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope)
      .eq("consent_status", "granted")
      .eq("birth_day", todayDay)
      .eq("birth_month", todayMonth),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope),
    supabase
      .from("interests")
      .select("*")
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope)
      .order("name", { ascending: true }),
    supabase.rpc("get_scope_geo_summary", {
      p_tenant_id: base.tenant.id,
      p_data_scope: base.activeScope,
      p_selected_city: selectedCity || null,
    }),
  ]);

  let cityCounts: Array<[string, number]> = [];
  let neighborhoods: string[] = [];

  if (!geoRpcError && geoSummary) {
    const parsedGeo = geoSummary as {
      cities?: Array<{ city: string; count: number }>;
      neighborhoods?: string[];
    };
    cityCounts = (parsedGeo.cities ?? []).map((item) => [
      item.city,
      Number(item.count),
    ]);
    neighborhoods = parsedGeo.neighborhoods ?? [];
  } else {
    const { data: geoRows } = await supabase
      .from("contacts")
      .select("city, neighborhood")
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope);

    const cityMap = new Map<string, number>();
    const neighborhoodSet = new Set<string>();
    for (const row of (geoRows as Array<{ city: string; neighborhood: string | null }> | null) ?? []) {
      if (row.city) {
        cityMap.set(row.city, (cityMap.get(row.city) ?? 0) + 1);
      }
      if (row.neighborhood && (!selectedCity || row.city === selectedCity)) {
        neighborhoodSet.add(row.neighborhood);
      }
    }
    cityCounts = Array.from(cityMap.entries()).sort((a, b) =>
      b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "pt-BR")
    );
    neighborhoods = Array.from(neighborhoodSet).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }

  let interestContactIds: string[] | null = null;
  if (selectedInterest) {
    const { data: ciRows } = await supabase
      .from("contact_interests")
      .select("contact_id")
      .eq("tenant_id", base.tenant.id)
      .eq("interest_id", selectedInterest);

    interestContactIds = (
      (ciRows as Array<{ contact_id: string }> | null) ?? []
    ).map((r) => r.contact_id);
  }

  let contacts: ContactWithInterests[] = [];
  let totalFiltered = 0;

  if (interestContactIds !== null && interestContactIds.length === 0) {
    contacts = [];
    totalFiltered = 0;
  } else {
    let query = supabase
      .from("contacts")
      .select("*, contact_interests(interest_id, interests(id, name))", {
        count: "exact",
      })
      .eq("tenant_id", base.tenant.id)
      .eq("data_scope", base.activeScope);

    if (selectedCity) {
      query = query.eq("city", selectedCity);
    }
    if (selectedNeighborhood) {
      query = query.eq("neighborhood", selectedNeighborhood);
    }
    if (interestContactIds !== null) {
      query = query.in("id", interestContactIds);
    }
    if (searchQuery) {
      const sanitized = searchQuery.replace(/[,%()]/g, "").trim();
      if (sanitized) {
        query = query.or(
          `full_name.ilike.%${sanitized}%,neighborhood.ilike.%${sanitized}%,whatsapp.ilike.%${sanitized}%`
        );
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: pagedRows, count: filteredCount } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    contacts =
      (pagedRows as unknown as ContactWithInterests[] | null) ?? [];
    totalFiltered = filteredCount ?? 0;
  }

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  return {
    ...base,
    activeContactsCount: activeCount ?? 0,
    todaysBirthdaysCount: birthdaysCount ?? 0,
    totalScopeContacts: totalScopeCount ?? 0,
    totalFiltered,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
    contacts,
    interests: (interestRows as Interest[] | null) ?? [],
    cityCounts,
    neighborhoods,
  };
}

export async function loadContactDetail(
  contactId: string
): Promise<ContactDetailData> {
  const base = await loadAuthenticatedMembership();

  if (!base.tenant) {
    return {
      ...base,
      contact: null,
      scopeInterests: [],
      consentRecords: [],
      todaysBirthdaysCount: 0,
    };
  }

  const supabase = await createClient();
  const { day: todayDay, month: todayMonth } = getTodayInBrazil();

  const { data: contactRow } = await supabase
    .from("contacts")
    .select("*, contact_interests(interest_id, interests(id, name))")
    .eq("id", contactId)
    .eq("tenant_id", base.tenant.id)
    .maybeSingle();

  const contact =
    (contactRow as unknown as ContactWithInterests | null) ?? null;

  if (!contact) {
    return {
      ...base,
      contact: null,
      scopeInterests: [],
      consentRecords: [],
      todaysBirthdaysCount: 0,
    };
  }

  const [{ data: interestRows }, { data: consentRows }, { count: bCount }] =
    await Promise.all([
      supabase
        .from("interests")
        .select("*")
        .eq("tenant_id", base.tenant.id)
        .eq("data_scope", contact.data_scope)
        .order("name", { ascending: true }),
      supabase
        .from("consent_records")
        .select("*")
        .eq("tenant_id", base.tenant.id)
        .eq("contact_id", contact.id)
        .order("recorded_at", { ascending: false }),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", base.tenant.id)
        .eq("data_scope", contact.data_scope)
        .eq("consent_status", "granted")
        .eq("birth_day", todayDay)
        .eq("birth_month", todayMonth),
    ]);

  return {
    ...base,
    activeScope: contact.data_scope,
    contact,
    scopeInterests: (interestRows as Interest[] | null) ?? [],
    consentRecords: (consentRows as ConsentRecord[] | null) ?? [],
    todaysBirthdaysCount: bCount ?? 0,
  };
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
