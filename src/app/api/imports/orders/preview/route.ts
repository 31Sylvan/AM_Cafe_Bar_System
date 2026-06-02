import { NextResponse } from "next/server";
import { requireOwner, requireProfile } from "@/lib/auth";
import { previewOrderWorkbooks } from "@/lib/imports/order-xls";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profile = await requireProfile();
  requireOwner(profile);

  const formData = await request.formData();
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "请上传至少一个订单 Excel 文件" }, { status: 400 });
  }

  if (files.some((file) => file.size > 2 * 1024 * 1024)) {
    return NextResponse.json({ error: "单个订单文件不能超过 2MB" }, { status: 400 });
  }

  const result = await previewOrderWorkbooks(files);
  return NextResponse.json(result);
}
