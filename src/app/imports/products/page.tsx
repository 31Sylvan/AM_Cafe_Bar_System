import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { requireOwner, requireProfile } from "@/lib/auth";
import { ProductCatalogImporter } from "./product-catalog-importer";

export const dynamic = "force-dynamic";

export default async function ProductCatalogImportPage() {
  const profile = await requireProfile();
  requireOwner(profile);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="商品导出接入"
        description="上传门店商品导出表，系统会提取可用于产品档案、销售匹配和订单导入的标准数据。"
        action={
          <Button asChild variant="secondary">
            <Link href="/imports">返回导入中心</Link>
          </Button>
        }
      />
      <ProductCatalogImporter />
    </AppShell>
  );
}
