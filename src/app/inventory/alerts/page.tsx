import Link from "next/link";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { listInventoryBalances } from "@/lib/data/inventory";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryAlertsPage() {
  const profile = await requireProfile();
  const alerts = (await listInventoryBalances()).filter((item) => item.is_low_stock);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="库存预警"
        description="当前库存小于或等于安全库存时触发预警。"
        action={
          <Button asChild variant="secondary">
            <Link href="/inventory/replenishment">查看补货建议</Link>
          </Button>
        }
      />
      {alerts.length === 0 ? (
        <EmptyState title="暂无库存预警" description="所有原料都高于安全库存线。" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((item) => (
            <div key={item.item_id} className="rounded-md border border-amber-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{item.name}</h2>
                <Badge className="border-amber-200 bg-amber-50 text-amber-800">预警</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-stone-500">当前库存</div>
                  <div className="mt-1 font-medium">{formatQty(item.current_qty, item.unit)}</div>
                </div>
                <div>
                  <div className="text-stone-500">安全库存</div>
                  <div className="mt-1 font-medium">{formatQty(item.safe_stock, item.unit)}</div>
                </div>
                <div>
                  <div className="text-stone-500">分类</div>
                  <div className="mt-1 font-medium">{item.category}</div>
                </div>
                <div>
                  <div className="text-stone-500">库存价值</div>
                  <div className="mt-1 font-medium">{formatMoney(item.inventory_value)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
