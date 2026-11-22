import type { TenantRole } from "@/lib/types/database";

export type Permission =
  | "contacts:view"
  | "contacts:edit"
  | "contacts:delete"
  | "imports:manage"
  | "exports:manage"
  | "integrations:manage"
  | "branding:manage"
  | "team:manage"
  | "links:manage"
  | "audit:view";

const ROLE_PERMISSIONS: Record<TenantRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>([
    "contacts:view",
    "contacts:edit",
    "contacts:delete",
    "imports:manage",
    "exports:manage",
    "integrations:manage",
    "branding:manage",
    "team:manage",
    "links:manage",
    "audit:view",
  ]),
  admin: new Set<Permission>([
    "contacts:view",
    "contacts:edit",
    "contacts:delete",
    "imports:manage",
    "exports:manage",
    "integrations:manage",
    "branding:manage",
    "team:manage",
    "links:manage",
    "audit:view",
  ]),
  advisor: new Set<Permission>(["contacts:view", "contacts:edit"]),
  viewer: new Set<Permission>(["contacts:view"]),
};

export function hasPermission(
  role: TenantRole | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export const ROLE_LABELS_PT_BR: Record<TenantRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  advisor: "Assessor",
  viewer: "Somente leitura",
};

export const ROLE_DESCRIPTIONS_PT_BR: Record<TenantRole, string> = {
  owner: "Controle total do ambiente, equipe, identidade visual e dados.",
  admin: "Gerencia contatos, importações, links, identidade visual e equipe.",
  advisor: "Visualiza e edita contatos, registra atendimentos e aniversários.",
  viewer: "Apenas consulta a base de contatos sem permissão de edição.",
};
