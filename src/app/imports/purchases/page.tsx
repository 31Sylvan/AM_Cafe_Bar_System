import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { requirePermission, requireProfile } from "@/lib/auth";
import { SpreadsheetImporter } from "../spreadsheet-importer";

export const dynamic = "force-dynamic";

export default async function PurchaseImportPage() {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="采购表导入"
        description="导入采购明细，系统按供应商、日期和付款方式自动生成采购单、库存流水和现金支出。"
        action={
          <Button asChild variant="secondary">
            <Link href="/imports">返回导入中心</Link>
          </Button>
        }
      />
      <SpreadsheetImporter kind="purchases" />
    </AppShell>
  );
}
