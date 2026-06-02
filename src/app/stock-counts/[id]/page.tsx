import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { STOCK_COUNT_TYPES } from "@/lib/constants";
import { getStockCount } from "@/lib/data/operations";
import { formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

const typeLabels = Object.fromEntries(STOCK_COUNT_TYPES.map((item) => [item.value, item.label]));

export default async function StockCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await params;
  const count = await getStockCount(id);

  if (!count) notFound();

  const lossCount = count.stock_count_items.filter((item) => Number(item.difference_qty) < 0).length;
  const gainCount = count.stock_count_items.filter((item) => Number(item.difference_qty) > 0).length;

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="盘点单详情"
        description={`${count.count_date} / ${typeLabels[count.count_type]}`}
        action={
          <Button asChild variant="secondary">
            <Link href="/stock-counts">返回盘点列表</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Summary label="盘点日期" value={count.count_date} />
        <Summary label="盘点类型" value={typeLabels[count.count_type]} />
        <Summary label="盘亏项" value={`${lossCount}`} />
        <Summary label="盘盈项" value={`${gainCount}`} />
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-stone-100 text-xs font-medium text-stone-500">
            <tr>
              <th className="px-4 py-3">原料</th>
              <th className="px-4 py-3">分类</th>
              <th className="px-4 py-3">理论库存</th>
              <th className="px-4 py-3">实际库存</th>
              <th className="px-4 py-3">差异</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {count.stock_count_items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium">{item.inventory_items?.name ?? item.item_id}</td>
                <td className="px-4 py-3">
                  <Badge>{item.inventory_items?.category ?? "-"}</Badge>
                </td>
                <td className="px-4 py-3">{formatQty(item.theoretical_qty, item.inventory_items?.unit)}</td>
                <td className="px-4 py-3">{formatQty(item.actual_qty, item.inventory_items?.unit)}</td>
                <td className="px-4 py-3 font-medium">{formatQty(item.difference_qty, item.inventory_items?.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-2 font-semibold">{value}</div>
    </div>
  );
}
