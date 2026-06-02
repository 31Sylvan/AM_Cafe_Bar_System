import { NextResponse } from "next/server";
import { requirePermission, requireProfile } from "@/lib/auth";
import { backupReports } from "@/lib/backup";
import { getCurrentStore } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const profile = await requireProfile();
  requirePermission(profile, "backup.manage");
  const store = await getCurrentStore();
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    store: {
      id: store?.id ?? profile.store_id,
      name: store?.name ?? "Aroma Melody Cafe & Bar",
    },
    reports: backupReports.map((report) => ({
      ...report,
      url: `${origin}${report.href}`,
    })),
  });
}
