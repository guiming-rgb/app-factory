/**
 * Enterprise White-Label Service
 *
 * Manages per-workspace brand identity (logo, colors, custom domain,
 * email branding). Also provides a utility to inject branding into
 * generated AppSpecs so all codegen output uses the workspace's brand.
 */

import { getSupabaseAdmin } from "@/lib/supabase";
import type { AppSpec } from "@/lib/app-spec/types";

// ── Types ─────────────────────────────────────────────────────────

export type WhiteLabelConfig = {
  workspaceId: string;
  brandName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  customDomain: string | null;
  customCss: string | null;
  emailFrom: string | null;
  emailFooter: string | null;
  hidePoweredBy: boolean;
  createdAt: string;
  updatedAt: string;
};

// ── Row conversion ────────────────────────────────────────────────

function rowToConfig(row: Record<string, unknown>): WhiteLabelConfig {
  return {
    workspaceId: String(row.workspace_id),
    brandName: row.brand_name ? String(row.brand_name) : null,
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    faviconUrl: row.favicon_url ? String(row.favicon_url) : null,
    primaryColor: String(row.primary_color ?? "#0D9488"),
    secondaryColor: row.secondary_color ? String(row.secondary_color) : null,
    customDomain: row.custom_domain ? String(row.custom_domain) : null,
    customCss: row.custom_css ? String(row.custom_css) : null,
    emailFrom: row.email_from ? String(row.email_from) : null,
    emailFooter: row.email_footer ? String(row.email_footer) : null,
    hidePoweredBy: Boolean(row.hide_powered_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Set (upsert) the white-label configuration for a workspace.
 * Only provided fields are updated; omitted fields keep their current values.
 */
export async function setWhiteLabel(
  workspaceId: string,
  config: Partial<Omit<WhiteLabelConfig, "workspaceId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const row: Record<string, unknown> = {
    workspace_id: workspaceId,
    updated_at: new Date().toISOString(),
  };

  if (config.brandName !== undefined) row.brand_name = config.brandName;
  if (config.logoUrl !== undefined) row.logo_url = config.logoUrl;
  if (config.faviconUrl !== undefined) row.favicon_url = config.faviconUrl;
  if (config.primaryColor !== undefined) row.primary_color = config.primaryColor;
  if (config.secondaryColor !== undefined) row.secondary_color = config.secondaryColor;
  if (config.customDomain !== undefined) row.custom_domain = config.customDomain;
  if (config.customCss !== undefined) row.custom_css = config.customCss;
  if (config.emailFrom !== undefined) row.email_from = config.emailFrom;
  if (config.emailFooter !== undefined) row.email_footer = config.emailFooter;
  if (config.hidePoweredBy !== undefined) row.hide_powered_by = config.hidePoweredBy;

  const { error } = await supabase.from("white_label_configs").upsert(row, {
    onConflict: "workspace_id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to save white-label config: ${error.message}`);
  }
}

/**
 * Get the white-label configuration for a workspace.
 */
export async function getWhiteLabel(
  workspaceId: string
): Promise<WhiteLabelConfig | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("white_label_configs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get white-label config: ${error.message}`);
  if (!data) return null;

  return rowToConfig(data as Record<string, unknown>);
}

/**
 * Resolve a white-label config by custom domain (virtual-host routing).
 * Used by middleware / reverse-proxy to serve branded content on
 * customer domains.
 */
export async function resolveWhiteLabel(
  hostname: string
): Promise<WhiteLabelConfig | null> {
  const supabase = getSupabaseAdmin();

  // Try exact match first
  const cleanHost = hostname
    .replace(/^https?:\/\//, "")
    .split(":")[0]
    .toLowerCase()
    .trim();

  const { data, error } = await supabase
    .from("white_label_configs")
    .select("*")
    .eq("custom_domain", cleanHost)
    .maybeSingle();

  if (error) return null;
  if (data) return rowToConfig(data as Record<string, unknown>);

  // Try www-prefixed variant
  if (cleanHost.startsWith("www.")) {
    const { data: withoutWww } = await supabase
      .from("white_label_configs")
      .select("*")
      .eq("custom_domain", cleanHost.slice(4))
      .maybeSingle();

    if (withoutWww) return rowToConfig(withoutWww as Record<string, unknown>);
  } else {
    const { data: withWww } = await supabase
      .from("white_label_configs")
      .select("*")
      .eq("custom_domain", `www.${cleanHost}`)
      .maybeSingle();

    if (withWww) return rowToConfig(withWww as Record<string, unknown>);
  }

  return null;
}

/**
 * Inject brand configuration into an AppSpec so generated apps use the
 * workspace's brand identity.
 *
 * Modifies:
 * - colorScheme / theme
 * - app display name
 * - favicon / logo URLs
 * - navigation style
 * - hides "Powered by" when configured
 */
export function applyWhiteLabelToSpec(
  spec: AppSpec,
  config: WhiteLabelConfig
): AppSpec {
  const cloned: AppSpec = JSON.parse(JSON.stringify(spec));

  // Brand name → display name
  if (config.brandName?.trim()) {
    cloned.displayName = config.brandName.trim();
  }

  // Theme / color scheme
  const layoutRules = (cloned.layoutRules ?? {}) as Record<string, unknown>;
  const theme = (layoutRules.theme ?? {}) as Record<string, unknown>;

  theme.primaryColor = config.primaryColor;
  if (config.secondaryColor) {
    theme.secondaryColor = config.secondaryColor;
  }

  layoutRules.theme = theme;
  cloned.layoutRules = layoutRules;

  // Logo / favicon
  const metadata = (cloned.metadata ?? {}) as Record<string, unknown>;
  if (config.logoUrl) {
    metadata.logoUrl = config.logoUrl;
  }
  if (config.faviconUrl) {
    metadata.faviconUrl = config.faviconUrl;
  }

  // Hide "Powered by" branding
  if (config.hidePoweredBy) {
    metadata.hidePoweredBy = true;
  }

  // Insert white-label limitations
  cloned.metadata = metadata;
  const limitations = cloned.limitations ?? [];
  if (!limitations.includes("white-labeled")) {
    cloned.limitations = [...limitations];
  }

  return cloned;
}

/**
 * Get defaults for a WhiteLabelConfig (useful for forms).
 */
export function getDefaultWhiteLabelConfig(
  workspaceId: string
): WhiteLabelConfig {
  return {
    workspaceId,
    brandName: null,
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#0D9488",
    secondaryColor: null,
    customDomain: null,
    customCss: null,
    emailFrom: null,
    emailFooter: null,
    hidePoweredBy: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
