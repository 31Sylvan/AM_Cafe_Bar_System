import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { requirePermission, requireProfile } from "@/lib/auth";
import { SpreadsheetImporter } from "../spreadsheet-importer";

export const dynamic = "force-dynamic";

export default async function RecipeImportPage() {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="配方表导入"
        description="按产品导入配方用量；正式导入会覆盖文件中产品的旧配方，确保销售扣库存准确。"
        action={
          <Button asChild variant="secondary">
            <Link href="/imports">返回导入中心</Link>
          </Button>
        }
      />
      <SpreadsheetImporter kind="recipes" />
    </AppShell>
  );
}
