import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uiThemeSchema = z.object({
  brand: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  brandStrong: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentSoft: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  card: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  line: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  radiusMd: z.string().regex(/^\d+px$/),
  controlHeight: z.string().regex(/^\d+px$/),
  iconStroke: z.string().regex(/^\d+(\.\d+)?$/),
});

export async function GET() {
  const profile = await requireProfile();

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ theme: null });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("ui_theme")
    .eq("id", profile.store_id)
    .single();

  if (error) {
    return NextResponse.json({ theme: null });
  }

  return NextResponse.json({ theme: data?.ui_theme ?? null });
}

export async function POST(request: Request) {
  const profile = await requireProfile();
  requirePermission(profile, "theme.manage");
  const payload = uiThemeSchema.parse(await request.json());

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ theme: payload, mode: "demo" });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({ ui_theme: payload })
    .eq("id", profile.store_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ theme: payload, mode: "supabase" });
}

export async function DELETE() {
  const profile = await requireProfile();
  requirePermission(profile, "theme.manage");

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ theme: null, mode: "demo" });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({ ui_theme: {} })
    .eq("id", profile.store_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ theme: null, mode: "supabase" });
}
