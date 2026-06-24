/**
 * Enterprise Partner Program Service
 *
 * Full referral partner lifecycle:
 * - Registration & approval workflow
 * - Referral link generation with unique codes
 * - Conversion tracking on user signup
 * - Monthly commission calculation based on subscription revenue
 * - Payout recording
 *
 * Commission is calculated as a percentage of the first month's
 * subscription revenue for each converted referral.
 */

import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────

export type PartnerType = "agency" | "freelancer" | "platform";
export type PartnerStatus = "active" | "pending" | "suspended";

export type Partner = {
  id: string;
  name: string;
  type: PartnerType;
  email: string;
  website: string | null;
  commissionRate: number;
  referralCode: string | null;
  totalReferrals: number;
  totalCommission: number;
  status: PartnerStatus;
  createdAt: string;
  updatedAt: string;
};

export type Referral = {
  id: string;
  partnerId: string;
  referralCode: string;
  referredUserId: string | null;
  converted: boolean;
  convertedAt: string | null;
  createdAt: string;
};

export type CommissionResult = {
  partnerId: string;
  partnerName: string;
  month: string; // YYYY-MM
  totalRevenue: number;
  commissionRate: number;
  commission: number;
  referralCount: number;
};

export type RegisterPartnerInput = {
  name: string;
  type: PartnerType;
  email: string;
  website?: string;
  commissionRate?: number;
};

// ── Helpers ───────────────────────────────────────────────────────

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
const CODE_LENGTH = 8;

function generateReferralCode(): string {
  let code = "";
  const bytes = crypto.randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

function rowToPartner(row: Record<string, unknown>): Partner {
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as PartnerType,
    email: String(row.email),
    website: row.website ? String(row.website) : null,
    commissionRate: Number(row.commission_rate),
    referralCode: row.referral_code ? String(row.referral_code) : null,
    totalReferrals: Number(row.total_referrals),
    totalCommission: Number(row.total_commission),
    status: row.status as PartnerStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToReferral(row: Record<string, unknown>): Referral {
  return {
    id: String(row.id),
    partnerId: String(row.partner_id),
    referralCode: String(row.referral_code),
    referredUserId: row.referred_user_id ? String(row.referred_user_id) : null,
    converted: Boolean(row.converted),
    convertedAt: row.converted_at ? String(row.converted_at) : null,
    createdAt: String(row.created_at),
  };
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Register a new partner.
 * Generates a unique referral code. Partner starts in 'pending' status
 * and must be activated by an admin.
 */
export async function registerPartner(
  input: RegisterPartnerInput
): Promise<Partner> {
  const supabase = getSupabaseAdmin();

  // Generate unique referral code
  let referralCode = generateReferralCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: existing } = await supabase
      .from("partners")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (!existing) break;
    referralCode = generateReferralCode();
  }

  const { data: inserted, error } = await supabase
    .from("partners")
    .insert({
      name: input.name.trim(),
      type: input.type,
      email: input.email.toLowerCase().trim(),
      website: input.website?.trim() || null,
      commission_rate: input.commissionRate ?? 10.0,
      referral_code: referralCode,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      // unique_violation
      const field = error.message.includes("email") ? "email" : "unknown";
      throw new Error(`A partner with this ${field} already exists`);
    }
    throw new Error(`Failed to register partner: ${error.message}`);
  }

  return rowToPartner(inserted as Record<string, unknown>);
}

/**
 * Get a single partner by ID.
 */
export async function getPartner(id: string): Promise<Partner | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to get partner: ${error.message}`);
  if (!data) return null;

  return rowToPartner(data as Record<string, unknown>);
}

/**
 * List all partners, optionally filtered by status.
 */
export async function listPartners(
  status?: PartnerStatus
): Promise<Partner[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase.from("partners").select("*");

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list partners: ${error.message}`);

  return (data ?? []).map((r: Record<string, unknown>) => rowToPartner(r));
}

/**
 * Update partner status (activate, suspend, etc.).
 */
export async function updatePartnerStatus(
  id: string,
  status: PartnerStatus
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("partners")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(`Failed to update partner status: ${error.message}`);
}

/**
 * Generate a referral link for a partner.
 * The link includes the unique referral code and can be shared by the
 * partner on their website, social media, etc.
 */
export async function generateReferralLink(
  partnerId: string
): Promise<string> {
  const partner = await getPartner(partnerId);
  if (!partner) {
    throw new Error("Partner not found");
  }
  if (partner.status !== "active") {
    throw new Error("Partner is not active");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/signup?ref=${partner.referralCode}`;
}

/**
 * Track a referral event when a new user signs up with a referral code.
 */
export async function trackReferral(
  referralCode: string,
  newUserId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Find the partner by referral code
  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("id")
    .eq("referral_code", referralCode.toUpperCase().trim())
    .maybeSingle();

  if (partnerError) {
    console.warn("[partner] trackReferral lookup error:", partnerError.message);
    return;
  }
  if (!partner) {
    console.warn(`[partner] Unknown referral code: ${referralCode}`);
    return;
  }

  // Insert referral record
  const { error: insertError } = await supabase.from("referrals").insert({
    partner_id: partner.id,
    referral_code: referralCode.toUpperCase().trim(),
    referred_user_id: newUserId,
  });

  if (insertError) {
    console.warn("[partner] Failed to record referral:", insertError.message);
    return;
  }

  // Increment total_referrals counter
  try {
    await supabase.rpc("increment_partner_referrals", {
      p_partner_id: partner.id,
    });
  } catch {
    // Fallback: direct update
    try {
      await supabase
        .from("partners")
        .update({
          total_referrals: supabase.rpc("increment_partner_referrals", {
            p_partner_id: partner.id,
          }) as unknown as number,
        })
        .eq("id", partner.id);
    } catch {
      // Silently ignore counter update failures
    }
  }
}

/**
 * Calculate commission for a partner for a given month.
 *
 * Commission is calculated based on subscription revenue generated
 * by the partner's converted referrals. This queries:
 * - All converted referrals for the partner
 * - Subscription orders from the referred users in the given month
 * - Applies the partner's commission rate
 */
export async function calculateCommission(
  partnerId: string,
  month: string // YYYY-MM
): Promise<CommissionResult> {
  const partner = await getPartner(partnerId);
  if (!partner) {
    throw new Error("Partner not found");
  }

  const supabase = getSupabaseAdmin();
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monthStr, 10);
  const startDate = new Date(year, mon - 1, 1).toISOString();
  const endDate = new Date(year, mon, 1).toISOString();

  // Get all converted referrals with a referred user
  const { data: referrals, error: refError } = await supabase
    .from("referrals")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("converted", true)
    .not("referred_user_id", "is", null);

  if (refError) {
    throw new Error(`Failed to query referrals: ${refError.message}`);
  }

  const referredUserIds = (referrals ?? [])
    .map((r: Record<string, unknown>) => String(r.referred_user_id))
    .filter(Boolean);

  if (referredUserIds.length === 0) {
    return {
      partnerId: partner.id,
      partnerName: partner.name,
      month,
      totalRevenue: 0,
      commissionRate: partner.commissionRate,
      commission: 0,
      referralCount: 0,
    };
  }

  // Query subscription revenue from the orders table for these users
  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("amount, currency, created_at, owner_id")
    .in("owner_id", referredUserIds)
    .gte("created_at", startDate)
    .lt("created_at", endDate)
    .eq("status", "paid");

  if (orderError) {
    // Orders table may not exist in all deployments; return zero
    console.warn("[partner] orders query:", orderError.message);
  }

  const totalRevenue = (orders ?? []).reduce(
    (sum: number, o: Record<string, unknown>) => sum + Number(o.amount ?? 0),
    0
  );

  const commission = Math.round(totalRevenue * (partner.commissionRate / 100) * 100) / 100;

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    month,
    totalRevenue,
    commissionRate: partner.commissionRate,
    commission,
    referralCount: referredUserIds.length,
  };
}

/**
 * Mark a referral as converted (e.g., when the referred user makes a
 * purchase or subscribes).
 */
export async function markReferralConverted(
  referralId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: referral, error: getError } = await supabase
    .from("referrals")
    .select("partner_id")
    .eq("id", referralId)
    .maybeSingle();

  if (getError || !referral) {
    throw new Error("Referral not found");
  }

  const now = new Date().toISOString();

  await supabase.from("referrals").update({
    converted: true,
    converted_at: now,
  }).eq("id", referralId);

  // Update partner totals
  try {
    await supabase
      .from("partners")
      .update({
        total_referrals: supabase.rpc("get_ref_count", {
          p_partner_id: referral.partner_id,
        }) as unknown as number,
      })
      .eq("id", referral.partner_id);
  } catch {
    // Silently ignore counter update failures
  }
}

/**
 * Record a commission payout for a partner.
 */
export async function payoutPartner(
  partnerId: string,
  amount: number
): Promise<void> {
  const partner = await getPartner(partnerId);
  if (!partner) {
    throw new Error("Partner not found");
  }

  const supabase = getSupabaseAdmin();
  const payoutId = crypto.randomUUID();

  // Record the payout in a payouts table
  const { error: payoutError } = await supabase.from("partner_payouts").insert({
    id: payoutId,
    partner_id: partnerId,
    amount,
    currency: "USD",
    status: "completed",
    paid_at: new Date().toISOString(),
  });

  if (payoutError) {
    throw new Error(`Failed to record payout: ${payoutError.message}`);
  }

  // Deduct from total_commission
  const newTotal = Math.max(0, partner.totalCommission - amount);
  const { error: updateError } = await supabase
    .from("partners")
    .update({ total_commission: newTotal })
    .eq("id", partnerId);

  if (updateError) {
    console.warn(
      "[partner] Failed to update total_commission after payout:",
      updateError.message
    );
  }
}
