/**
 * Enterprise SLA Tracking Service
 *
 * Manages SLA configuration, incident lifecycle (outage / degraded /
 * maintenance), monthly SLA metrics per workspace, and global uptime
 * aggregation.
 *
 * Duration calculation for resolved incidents:
 *   duration_minutes = (resolved_at - started_at) in minutes, clamped to 1.
 *
 * Monthly metrics compute uptime % based on total incident downtime
 * in the month vs total minutes in the month.
 */

import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────

export type SupportLevel = "standard" | "priority" | "dedicated";
export type IncidentType = "outage" | "degraded" | "maintenance";

export type SLAConfig = {
  workspaceId: string;
  uptimeTarget: number;
  responseTimeTarget: number; // ms
  supportLevel: SupportLevel;
  createdAt: string;
  updatedAt: string;
};

export type Incident = {
  id: string;
  workspaceId: string;
  type: IncidentType;
  description: string | null;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
  createdAt: string;
};

export type SLAMetrics = {
  workspaceId: string;
  month: string; // YYYY-MM
  uptime: number; // percentage
  avgResponseTime: number; // ms
  incidents: number;
  metTarget: boolean;
};

export type UptimeStatus = {
  current: boolean;
  last24h: number;
  last7d: number;
  last30d: number;
};

export type ReportIncidentInput = {
  type: IncidentType;
  description?: string;
  startedAt?: string; // ISO string, defaults to now
};

// ── Helpers ───────────────────────────────────────────────────────

function rowToSLAConfig(row: Record<string, unknown>): SLAConfig {
  return {
    workspaceId: String(row.workspace_id),
    uptimeTarget: Number(row.uptime_target),
    responseTimeTarget: Number(row.response_time_ms),
    supportLevel: row.support_level as SupportLevel,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToIncident(row: Record<string, unknown>): Incident {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    type: row.type as IncidentType,
    description: row.description ? String(row.description) : null,
    startedAt: String(row.started_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    durationMinutes: row.duration_minutes ? Number(row.duration_minutes) : null,
    createdAt: String(row.created_at),
  };
}

function monthBounds(month: string): { start: string; end: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monthStr, 10);
  return {
    start: new Date(year, mon - 1, 1).toISOString(),
    end: new Date(year, mon, 1).toISOString(),
  };
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Set or update the SLA config for a workspace.
 */
export async function setSLAConfig(
  workspaceId: string,
  config: {
    uptimeTarget?: number;
    responseTimeTarget?: number;
    supportLevel?: SupportLevel;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const row: Record<string, unknown> = {
    workspace_id: workspaceId,
    updated_at: new Date().toISOString(),
  };

  if (config.uptimeTarget !== undefined) {
    if (config.uptimeTarget <= 0 || config.uptimeTarget > 100) {
      throw new Error("uptimeTarget must be between 0 and 100");
    }
    row.uptime_target = config.uptimeTarget;
  }
  if (config.responseTimeTarget !== undefined) {
    if (config.responseTimeTarget <= 0) {
      throw new Error("responseTimeTarget must be positive");
    }
    row.response_time_ms = config.responseTimeTarget;
  }
  if (config.supportLevel !== undefined) {
    if (!["standard", "priority", "dedicated"].includes(config.supportLevel)) {
      throw new Error("Invalid supportLevel");
    }
    row.support_level = config.supportLevel;
  }

  const { error } = await supabase.from("sla_configs").upsert(row, {
    onConflict: "workspace_id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to set SLA config: ${error.message}`);
  }
}

/**
 * Get the SLA config for a workspace.
 */
export async function getSLAConfig(
  workspaceId: string
): Promise<SLAConfig | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sla_configs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get SLA config: ${error.message}`);
  if (!data) return null;

  return rowToSLAConfig(data as Record<string, unknown>);
}

/**
 * Log a new SLA incident.
 * If `startedAt` is not provided, uses the current time.
 */
export async function trackIncident(
  workspaceId: string,
  type: IncidentType,
  description?: string,
  startedAt?: string
): Promise<Incident> {
  const supabase = getSupabaseAdmin();
  const id = crypto.randomUUID();

  const { data, error } = await supabase
    .from("sla_incidents")
    .insert({
      id,
      workspace_id: workspaceId,
      type,
      description: description || null,
      started_at: startedAt || new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to track incident: ${error.message}`);
  }

  return rowToIncident(data as Record<string, unknown>);
}

/**
 * Resolve an incident: mark it resolved and calculate duration in minutes.
 * The incident duration is the wall-clock time between started_at and now.
 */
export async function resolveIncident(incidentId: string): Promise<Incident> {
  const supabase = getSupabaseAdmin();

  const { data: incident, error: getError } = await supabase
    .from("sla_incidents")
    .select("*")
    .eq("id", incidentId)
    .maybeSingle();

  if (getError || !incident) {
    throw new Error("Incident not found");
  }

  const startedAt = new Date(incident.started_at);
  const resolvedAt = new Date();
  const durationMs = resolvedAt.getTime() - startedAt.getTime();
  const durationMinutes = Math.max(1, Math.ceil(durationMs / 60000));

  const { data, error } = await supabase
    .from("sla_incidents")
    .update({
      resolved_at: resolvedAt.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq("id", incidentId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to resolve incident: ${error.message}`);
  }

  return rowToIncident(data as Record<string, unknown>);
}

/**
 * Get list of incidents for a workspace, optionally filtered by month.
 */
export async function listIncidents(
  workspaceId: string,
  month?: string
): Promise<Incident[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("sla_incidents")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (month) {
    const { start, end } = monthBounds(month);
    query = query.gte("started_at", start).lt("started_at", end);
  }

  const { data, error } = await query.order("started_at", { ascending: false });

  if (error) throw new Error(`Failed to list incidents: ${error.message}`);

  return (data ?? []).map((r: Record<string, unknown>) => rowToIncident(r));
}

/**
 * Get monthly SLA metrics for a workspace.
 *
 * Uptime is calculated as:
 *   uptime % = ((total_minutes_in_month - incident_minutes) / total_minutes_in_month) * 100
 *
 * Only resolved incidents are counted (with a duration).
 */
export async function getSLAMetrics(
  workspaceId: string,
  month: string // YYYY-MM
): Promise<SLAMetrics> {
  const config = await getSLAConfig(workspaceId);
  const supabase = getSupabaseAdmin();
  const { start, end } = monthBounds(month);

  // Count resolved incidents with duration in the month
  const { data: incidents, error: incError } = await supabase
    .from("sla_incidents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("started_at", start)
    .lt("started_at", end);

  if (incError) {
    throw new Error(`Failed to query incidents: ${incError.message}`);
  }

  const resolvedIncidents = (incidents ?? []).filter(
    (i: Record<string, unknown>) => i.duration_minutes != null
  );

  const totalDowntimeMinutes = resolvedIncidents.reduce(
    (sum: number, i: Record<string, unknown>) =>
      sum + Number(i.duration_minutes ?? 0),
    0
  );

  // Calculate total minutes in the month
  const monthStart = new Date(start);
  const monthEnd = new Date(end);
  const totalMinutes = Math.round(
    (monthEnd.getTime() - monthStart.getTime()) / 60000
  );

  const uptime = totalMinutes > 0
    ? roundTo2(((totalMinutes - totalDowntimeMinutes) / totalMinutes) * 100)
    : 100;

  // Average response time from SLA config
  const avgResponseTime = config?.responseTimeTarget ?? 3600000;

  const metTarget = config
    ? uptime >= config.uptimeTarget
    : uptime >= 99.9;

  return {
    workspaceId,
    month,
    uptime,
    avgResponseTime,
    incidents: resolvedIncidents.length,
    metTarget,
  };
}

/**
 * Get global uptime status aggregated across all workspaces.
 *
 * Uses recent incidents to approximate global platform health.
 */
export async function getUptimeStatus(): Promise<UptimeStatus> {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  // Helper: get total unresolved minutes for a time window
  async function windowDowntime(since: Date): Promise<number> {
    const { data, error } = await supabase
      .from("sla_incidents")
      .select("started_at, resolved_at, duration_minutes")
      .gte("started_at", since.toISOString())
      .in("type", ["outage", "degraded"]);

    if (error) return 0;

    let total = 0;
    for (const inc of data ?? []) {
      if (inc.duration_minutes) {
        total += Number(inc.duration_minutes);
      } else if (!inc.resolved_at) {
        // Still ongoing — count from start to now
        const start = new Date(inc.started_at);
        total += Math.max(1, Math.round((now.getTime() - start.getTime()) / 60000));
      }
    }
    return total;
  }

  const nowUtc = now;
  const dayAgo = new Date(nowUtc.getTime() - 24 * 3600 * 1000);
  const weekAgo = new Date(nowUtc.getTime() - 7 * 24 * 3600 * 1000);
  const monthAgo = new Date(nowUtc.getTime() - 30 * 24 * 3600 * 1000);

  function calcUptime(downtimeMin: number, windowMin: number): number {
    if (windowMin <= 0) return 100;
    return roundTo2(((windowMin - downtimeMin) / windowMin) * 100);
  }

  const [down24h, down7d, down30d] = await Promise.all([
    windowDowntime(dayAgo),
    windowDowntime(weekAgo),
    windowDowntime(monthAgo),
  ]);

  // Check if there's a currently unresolved outage/degraded incident
  const { data: unresolved } = await supabase
    .from("sla_incidents")
    .select("id")
    .is("resolved_at", null)
    .in("type", ["outage", "degraded"])
    .limit(1);

  const current = (unresolved ?? []).length === 0;

  return {
    current,
    last24h: calcUptime(down24h, 24 * 60),
    last7d: calcUptime(down7d, 7 * 24 * 60),
    last30d: calcUptime(down30d, 30 * 24 * 60),
  };
}
