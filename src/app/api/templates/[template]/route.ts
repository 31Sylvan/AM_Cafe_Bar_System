import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/export/csv";
import { extraImportTemplates, importTemplateDefinitions } from "@/lib/import-templates";

export const dynamic = "force-dynamic";

const employeeTemplate = {
  key: "employees",
  filename: "employees-template.csv",
  fields: [
    { key: "name" },
    { key: "phone" },
    { key: "position" },
    { key: "hourly_rate" },
    { key: "hire_date" },
    { key: "status" },
  ],
  rows: [["小林", "13800000000", "咖啡师", "28", "2026-06-01", "active"]],
};

const templates = [...extraImportTemplates, ...importTemplateDefinitions, employeeTemplate];

export async function GET(_request: Request, { params }: { params: Promise<{ template: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  requirePermission(profile, "import.manage");

  const { template } = await params;
  const config = templates.find((item) => item.key === template);

  if (!config) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  return csvResponse(config.filename, toCsv(config.fields.map((field) => field.key), config.rows));
}
