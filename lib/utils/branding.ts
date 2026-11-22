export const DEFAULT_PRIMARY_COLOR = "#0B1E36";
export const DEFAULT_ACCENT_COLOR = "#0E7C55";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(color: string | null | undefined): boolean {
  if (!color) return false;
  return HEX_COLOR_REGEX.test(color.trim());
}

export function sanitizeHexColor(
  color: string | null | undefined,
  fallback: string
): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Retorna a cor de texto mais legível (#FFFFFF ou #111827) sobre uma cor de fundo,
 * além do ratio de contraste WCAG para sinalizar se o contraste está baixo.
 */
export function evaluateColorAccessibility(bgHex: string): {
  textColor: "#FFFFFF" | "#111827";
  contrastRatio: number;
  meetsAA: boolean;
} {
  const safeHex = sanitizeHexColor(bgHex, DEFAULT_PRIMARY_COLOR);
  const whiteRatio = getContrastRatio(safeHex, "#FFFFFF");
  const darkRatio = getContrastRatio(safeHex, "#111827");

  if (whiteRatio >= darkRatio) {
    return {
      textColor: "#FFFFFF",
      contrastRatio: Number(whiteRatio.toFixed(2)),
      meetsAA: whiteRatio >= 4.5,
    };
  }

  return {
    textColor: "#111827",
    contrastRatio: Number(darkRatio.toFixed(2)),
    meetsAA: darkRatio >= 4.5,
  };
}

/**
 * Gera variáveis CSS de tema para aplicar identidade visual por tokens sem espalhar hex fixos.
 */
export function buildTenantThemeStyle(
  primaryColor?: string | null,
  accentColor?: string | null
): Record<string, string> {
  const primary = sanitizeHexColor(primaryColor, DEFAULT_PRIMARY_COLOR);
  const accent = sanitizeHexColor(accentColor, DEFAULT_ACCENT_COLOR);

  return {
    "--color-brand-navy": primary,
    "--color-brand-emerald": accent,
    "--color-primary": primary,
    "--color-secondary": accent,
  };
}
