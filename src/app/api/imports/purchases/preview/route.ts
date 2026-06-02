import { NextResponse } from "next/server";
import { requirePermission, requireProfile } from "@/lib/auth";
import { previewPurchaseWorkbook } from "@/lib/imports/business-xls";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "请上传采购导入表" }, { status: 400 });
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "采购导入表不能超过 3MB" }, { status: 400 });
  }

  return NextResponse.json(await previewPurchaseWorkbook(file));
}
