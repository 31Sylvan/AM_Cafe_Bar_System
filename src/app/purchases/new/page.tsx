import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPurchaseOrderAction } from "@/lib/actions/purchases";
import { requireProfile } from "@/lib/auth";
import { PAYMENT_METHODS } from "@/lib/constants";
import { listInventoryItems } from "@/lib/data/inventory";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const profile = await requireProfile();
  const items = await listInventoryItems();

  return (
    <AppShell profile={profile}>
      <PageHeader title="新建采购" description="可一次录入多个采购明细，提交后自动逐条生成 PURCHASE 库存流水。" />
      <form action={createPurchaseOrderAction} className="rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="supplier">供应商</Label>
            <Input id="supplier" name="supplier" placeholder="例如 本地烘焙商" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase_date">采购日期</Label>
            <Input id="purchase_date" name="purchase_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">付款方式</Label>
            <Select id="payment_method" name="payment_method" defaultValue="微信" required>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {items.length === 0 ? <div className="mt-4 text-sm text-amber-700">请先由老板创建库存原料，再录入采购。</div> : null}

        <div className="mt-6 overflow-hidden rounded-md border border-stone-200">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">原料</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">单位</th>
                <th className="px-4 py-3">采购数量</th>
                <th className="px-4 py-3">采购单价</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{item.unit}</td>
                  <td className="px-4 py-3">
                    <Input name={`qty:${item.id}`} type="number" min="0.001" step="0.001" placeholder={item.unit} />
                  </td>
                  <td className="px-4 py-3">
                    <Input name={`unit_price:${item.id}`} type="number" min="0" step="0.0001" placeholder="¥" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <Button disabled={items.length === 0}>完成采购入库</Button>
        </div>
      </form>
    </AppShell>
  );
}
