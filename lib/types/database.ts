export type DataScope = "mandate" | "campaign";

export type OrganizationType = "mandate" | "pre_campaign" | "campaign" | "other";

export type TenantRole = "owner" | "admin" | "advisor" | "viewer";

export type ConsentStatus = "granted" | "revoked" | "pending";

export type ConsentAction = "granted" | "revoked";

export type ContactCategory =
  | "supporter"
  | "registered_contact"
  | "imported_record";

export interface SocialLinks {
  instagram?: string;
  whatsapp?: string;
  website?: string;
  facebook?: string;
}

export interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  team_role_label: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  public_display_name?: string | null;
  organization_type?: OrganizationType;
  office_title: string | null;
  city: string | null;
  state: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  accent_color?: string;
  social_links?: SocialLinks;
  onboarding_completed_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: string;
}

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: TenantRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface PublicLink {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  slug: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Contato no MVP/Evolução.
 * Minimização LGPD: não armazena CPF, religião, etnia, biometria ou opinião política detalhada.
 */
export interface Contact {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  full_name: string;
  whatsapp: string | null;
  email: string | null;
  instagram_handle?: string | null;
  instagram_handle_normalized?: string | null;
  city: string;
  neighborhood: string | null;
  birth_day: number | null;
  birth_month: number | null;
  contact_category?: ContactCategory;
  consent_status: ConsentStatus;
  consent_source: string;
  consent_version: string;
  consented_at: string | null;
  original_registered_at?: string | null;
  import_batch_id?: string | null;
  revoked_at: string | null;
  unsubscribe_token: string;
  created_at: string;
  updated_at: string;
}

export interface Interest {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  name: string;
  created_at: string;
}

export interface ConsentRecord {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  contact_id: string;
  action: ConsentAction;
  source: string;
  consent_version: string;
  consent_text_snapshot: string;
  recorded_at: string;
  ip_hash: string | null;
  user_agent: string | null;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  imported_by: string | null;
  file_name: string;
  declared_origin: string;
  declared_purpose: string;
  legal_basis: string;
  total_rows: number;
  imported_count: number;
  merged_count: number;
  pending_review_count: number;
  rejected_count: number;
  status: "processing" | "completed" | "deleted";
  retention_expires_at: string;
  created_at: string;
}

export type ImportMatchType =
  | "exact_instagram"
  | "exact_email"
  | "exact_phone"
  | "possible_duplicate"
  | "no_match";

export type ImportResolution =
  | "pending"
  | "created"
  | "merged"
  | "rejected"
  | "ignored";

export interface ImportRow {
  id: string;
  batch_id: string;
  tenant_id: string;
  data_scope: DataScope;
  row_number: number;
  raw_data: Record<string, string>;
  normalized_data: {
    full_name?: string;
    whatsapp?: string | null;
    email?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    instagram_handle?: string | null;
    instagram_handle_normalized?: string | null;
    original_origin?: string | null;
    original_registered_at?: string | null;
  };
  match_type: ImportMatchType;
  matched_contact_id: string | null;
  match_fields: string[];
  resolution: ImportResolution;
  error_message: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ContactMerge {
  id: string;
  tenant_id: string;
  data_scope: DataScope;
  target_contact_id: string;
  import_row_id: string | null;
  match_fields: string[];
  snapshot_before: Record<string, unknown>;
  merged_fields: Record<string, unknown>;
  merged_by: string | null;
  merged_at: string;
  undone_at: string | null;
  undone_by: string | null;
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  provider: "instagram_official";
  status: "connected" | "disconnected" | "pending_config";
  external_account_id: string | null;
  account_handle: string | null;
  granted_scopes: string[];
  connected_by: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  updated_at: string;
}
