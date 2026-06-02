import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createStockCountAction } from "@/lib/actions/operations";
import { requireProfile } from "@/lib/auth";
import { STOCK_COUNT_TYPES } from "@/lib/constants";
import { listInventoryBalances } from "@/lib/data/inventory";
import { formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewStockCountPage() {
  const profile = await requireProfile();
  const balances = await listInventoryBalances();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="新建盘点"
        description="一次盘点可录入多个原料，留空的原料不会写入本次盘点单。"
        action={
          <Button asChild variant="secondary">
            <Link href="/stock-counts/mobile">移动盘点模式</Link>
          </Button>
        }
      />
      <form action={createStockCountAction} className="rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="count_type">盘点类型</Label>
            <Select id="count_type" name="count_type" defaultValue="daily" required>
              {STOCK_COUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="count_date">盘点日期</Label>
            <Input id="count_date" name="count_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-md border border-stone-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">原料</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">理论库存</th>
                <th className="px-4 py-3">实际库存</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {balances.map((item) => (
                <tr key={item.item_id}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{formatQty(item.current_qty, item.unit)}</td>
                  <td className="px-4 py-3">
                    <Input name={`actual_qty:${item.item_id}`} type="number" min="0" step="0.001" placeholder={item.unit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <Button disabled={balances.length === 0}>完成盘点</Button>
        </div>
      </form>
    </AppShell>
  );
}
