import { NextResponse } from "next/server";
import { requireOwner, requireProfile } from "@/lib/auth";
import { previewProductCatalogWorkbook } from "@/lib/imports/product-xls";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profile = await requireProfile();
  requireOwner(profile);

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "请上传商品导出 Excel 文件" }, { status: 400 });
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "商品文件不能超过 3MB" }, { status: 400 });
  }

  const result = await previewProductCatalogWorkbook(file);
  return NextResponse.json(result);
}
