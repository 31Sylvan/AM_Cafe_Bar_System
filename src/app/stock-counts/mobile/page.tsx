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

export default async function MobileStockCountPage() {
  const profile = await requireProfile();
  const balances = await listInventoryBalances();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="移动盘点"
        description="适合手机端单手录入，只显示理论库存和实际库存输入。"
        action={
          <Button asChild variant="secondary">
            <Link href="/stock-counts/new">表格模式</Link>
          </Button>
        }
      />
      <form action={createStockCountAction} className="space-y-4">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="count_type">盘点类型</Label>
              <Select id="count_type" name="count_type" defaultValue="daily" required>
                {STOCK_COUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="count_date">盘点日期</Label>
              <Input id="count_date" name="count_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {balances.map((item) => (
            <section key={item.item_id} className="rounded-md border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <div className="mt-1 text-sm text-stone-500">{item.category} / {item.unit}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-stone-500">理论库存</div>
                  <div className="text-lg font-semibold">{formatQty(item.current_qty, item.unit)}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor={`actual-${item.item_id}`}>实际库存</Label>
                <Input
                  id={`actual-${item.item_id}`}
                  name={`actual_qty:${item.item_id}`}
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  placeholder={item.unit}
                  className="h-14 text-lg"
                />
              </div>
            </section>
          ))}
        </div>

        <div className="sticky bottom-16 z-10 rounded-md border border-stone-200 bg-white p-3 shadow-sm lg:bottom-4">
          <Button className="h-12 w-full" disabled={balances.length === 0}>完成盘点</Button>
        </div>
      </form>
    </AppShell>
  );
}
