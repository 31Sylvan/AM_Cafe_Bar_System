import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { requirePermission, requireProfile } from "@/lib/auth";
import { SpreadsheetImporter } from "../spreadsheet-importer";

export const dynamic = "force-dynamic";

export default async function InventoryImportPage() {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="库存管理导入"
        description="导入原料档案、成本、安全库存和实际库存；实际库存会生成盘点调整流水。"
        action={
          <Button asChild variant="secondary">
            <Link href="/imports">返回导入中心</Link>
          </Button>
        }
      />
      <SpreadsheetImporter kind="inventory" />
    </AppShell>
  );
}
