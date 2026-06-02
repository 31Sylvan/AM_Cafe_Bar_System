import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { validateImportCsv, type ImportTemplate } from "@/lib/imports/validate";

export const dynamic = "force-dynamic";

const templates = new Set<ImportTemplate>(["inventory-items", "products", "employees", "purchases", "sales-batch"]);

export async function POST(request: Request) {
  await requireProfile();

  const formData = await request.formData();
  const template = String(formData.get("template") ?? "");
  const file = formData.get("file");

  if (!templates.has(template as ImportTemplate)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "CSV 文件不能为空" }, { status: 400 });
  }

  if (file.size > 1024 * 1024) {
    return NextResponse.json({ error: "CSV 文件不能超过 1MB" }, { status: 400 });
  }

  const csv = await file.text();
  const result = validateImportCsv(template as ImportTemplate, csv);

  return NextResponse.json(result);
}
