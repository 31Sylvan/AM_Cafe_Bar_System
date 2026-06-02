import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { requireOwner, requireProfile } from "@/lib/auth";
import { OrderPreview } from "./order-preview";

export const dynamic = "force-dynamic";

export default async function OrderImportPage() {
  const profile = await requireProfile();
  requireOwner(profile);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="真实订单接入"
        description="上传店内/自提订单 Excel，系统会过滤未支付和已取消订单，并转换成标准销售批量 CSV。"
        action={
          <Button asChild variant="secondary">
            <Link href="/imports">返回导入预检</Link>
          </Button>
        }
      />
      <OrderPreview />
    </AppShell>
  );
}
