import { NextResponse } from "next/server";

import { getDeployStatus } from "@/lib/deploy/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDeployStatus());
}
