import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/export/csv";

export const dynamic = "force-dynamic";

const templates = {
  "inventory-items": {
    filename: "inventory-items-template.csv",
    headers: ["name", "category", "unit", "specification", "safe_stock", "cost_price", "status"],
    rows: [["中深烘咖啡豆", "咖啡豆", "g", "1kg/袋", "800", "0.18", "active"]],
  },
  products: {
    filename: "products-template.csv",
    headers: ["name", "category", "sale_price", "status"],
    rows: [["拿铁", "咖啡", "28", "active"]],
  },
  employees: {
    filename: "employees-template.csv",
    headers: ["name", "phone", "position", "hourly_rate", "hire_date", "status"],
    rows: [["小林", "13800000000", "咖啡师", "28", "2026-06-01", "active"]],
  },
  purchases: {
    filename: "purchase-lines-template.csv",
    headers: ["supplier", "purchase_date", "item_name", "qty", "unit_price"],
    rows: [["本地烘焙商", "2026-06-01", "中深烘咖啡豆", "2000", "0.38"]],
  },
  "sales-batch": {
    filename: "sales-batch-template.csv",
    headers: ["sale_date", "channel", "payment_method", "product_name", "qty", "unit_price", "external_order_no"],
    rows: [["2026-06-01", "堂食", "微信", "拿铁", "2", "28", "POS-20260601-001"]],
  },
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ template: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  requireOwner(profile);

  const { template } = await params;
  const config = templates[template as keyof typeof templates];

  if (!config) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  return csvResponse(config.filename, toCsv(config.headers, config.rows));
}
