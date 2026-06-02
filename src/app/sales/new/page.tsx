import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createSaleOrderAction } from "@/lib/actions/operations";
import { requireProfile } from "@/lib/auth";
import { PAYMENT_METHODS, SALES_CHANNELS } from "@/lib/constants";
import { listProducts } from "@/lib/data/products";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const profile = await requireProfile();
  const products = await listProducts();

  return (
    <AppShell profile={profile}>
      <PageHeader title="录入销售" description="一张销售单可录入多个产品，提交后按各自配方生成 SALE 库存流水。" />
      <form action={createSaleOrderAction} className="rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sale_date">销售日期</Label>
            <Input id="sale_date" name="sale_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">渠道</Label>
            <Select id="channel" name="channel" defaultValue="堂食" required>
              {SALES_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">收款方式</Label>
            <Select id="payment_method" name="payment_method" defaultValue="微信" required>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {products.length === 0 ? <div className="mt-4 text-sm text-amber-700">请先创建产品和配方，再录入销售。</div> : null}

        <div className="mt-6 overflow-hidden rounded-md border border-stone-200">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">产品</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">标价</th>
                <th className="px-4 py-3">销售数量</th>
                <th className="px-4 py-3">成交单价</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3">¥{product.sale_price}</td>
                  <td className="px-4 py-3">
                    <Input name={`qty:${product.id}`} type="number" min="0.001" step="0.001" />
                  </td>
                  <td className="px-4 py-3">
                    <Input name={`unit_price:${product.id}`} type="number" min="0" step="0.01" defaultValue={product.sale_price} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <Button disabled={products.length === 0}>提交销售</Button>
        </div>
      </form>
    </AppShell>
  );
}
