import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { listInventoryBalances } from "@/lib/data/inventory";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryItemsPage() {
  const profile = await requireProfile();
  const items = await listInventoryBalances();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="库存中心"
        description="库存余额由流水聚合计算，不能直接修改数量。"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton report="inventory" />
            {profile.role === "owner" ? (
              <Button asChild>
                <Link href="/inventory/items/new">
                  <Plus className="h-4 w-4" />
                  新建原料
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="还没有库存原料" description="老板账号可先录入咖啡豆、牛奶、酒类、耗材等基础原料。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">原料</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">库存</th>
                <th className="px-4 py-3">安全线</th>
                <th className="px-4 py-3">参考成本</th>
                <th className="px-4 py-3">库存价值</th>
                <th className="px-4 py-3">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => (
                <tr key={item.item_id}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{formatQty(item.current_qty, item.unit)}</td>
                  <td className="px-4 py-3">{formatQty(item.safe_stock, item.unit)}</td>
                  <td className="px-4 py-3">{formatMoney(item.cost_price)}</td>
                  <td className="px-4 py-3">{formatMoney(item.inventory_value)}</td>
                  <td className="px-4 py-3">
                    {item.is_low_stock ? <Badge className="border-amber-200 bg-amber-50 text-amber-800">预警</Badge> : <Badge>正常</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
