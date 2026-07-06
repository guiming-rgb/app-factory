import { NextResponse } from "next/server";

import { getDeployStatus } from "@/lib/deploy/status";
import { requireAuth } from "@/lib/auth/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  return NextResponse.json(await getDeployStatus());
}
