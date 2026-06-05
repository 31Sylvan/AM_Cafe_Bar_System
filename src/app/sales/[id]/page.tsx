import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { voidSaleOrderAction } from "@/lib/actions/operations";
import { requireProfile } from "@/lib/auth";
import { getSalesOrder } from "@/lib/data/operations";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await params;
  const order = await getSalesOrder(id);

  if (!order) notFound();

  const grossProfit = Number(order.total_amount) - order.sales_order_items.reduce((sum, item) => sum + Number(item.theoretical_cost), 0);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="销售单详情"
        description={`${order.sale_date} / ${order.channel} / ${order.payment_method}`}
        action={
          <div className="flex flex-wrap gap-2">
            {profile.role === "owner" && order.status !== "void" ? (
              <ReactiveForm action={voidSaleOrderAction} successText="销售单已作废">
                <input type="hidden" name="sales_order_id" value={order.id} />
                <Button variant="secondary">
                  <RotateCcw className="h-4 w-4" />
                  作废销售
                </Button>
              </ReactiveForm>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/sales">返回销售列表</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Summary label="销售日期" value={order.sale_date} />
        <Summary label="销售金额" value={formatMoney(order.total_amount)} />
        <Summary label="理论毛利" value={formatMoney(grossProfit)} />
        <Summary label="状态" value={order.status === "void" ? "已作废" : "已完成"} />
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-stone-100 text-xs font-medium text-stone-500">
            <tr>
              <th className="px-4 py-3">产品</th>
              <th className="px-4 py-3">分类</th>
              <th className="px-4 py-3">数量</th>
              <th className="px-4 py-3">单价</th>
              <th className="px-4 py-3">金额</th>
              <th className="px-4 py-3">理论成本</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {order.sales_order_items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium">{item.products?.name ?? item.product_id}</td>
                <td className="px-4 py-3">
                  <Badge>{item.products?.category ?? "-"}</Badge>
                </td>
                <td className="px-4 py-3">{formatQty(item.qty)}</td>
                <td className="px-4 py-3">{formatMoney(item.unit_price)}</td>
                <td className="px-4 py-3 font-medium">{formatMoney(item.amount)}</td>
                <td className="px-4 py-3">{formatMoney(item.theoretical_cost)}</td>
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
