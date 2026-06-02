import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "coffee-shop-os",
    supabaseConfigured: hasSupabaseEnv(),
    checkedAt: new Date().toISOString(),
  });
}
