import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { voidPurchaseOrderAction } from "@/lib/actions/purchases";
import { requireProfile } from "@/lib/auth";
import { getPurchaseOrder } from "@/lib/data/purchases";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await params;
  const order = await getPurchaseOrder(id);

  if (!order) notFound();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="采购单详情"
        description={`${order.supplier} / ${order.purchase_date}`}
        action={
          <div className="flex flex-wrap gap-2">
            {profile.role === "owner" && order.status === "completed" ? (
              <ReactiveForm action={voidPurchaseOrderAction} successText="采购单已作废">
                <input type="hidden" name="purchase_order_id" value={order.id} />
                <Button variant="secondary">
                  <RotateCcw className="h-4 w-4" />
                  作废采购
                </Button>
              </ReactiveForm>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/purchases">返回采购列表</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Summary label="供应商" value={order.supplier} />
        <Summary label="采购日期" value={order.purchase_date} />
        <Summary label="总金额" value={formatMoney(order.total_amount)} />
        <Summary label="付款方式" value={order.payment_method} />
        <Summary label="状态" value={order.status === "completed" ? "已入库" : order.status === "void" ? "已作废" : "草稿"} />
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-100 text-xs font-medium text-stone-500">
            <tr>
              <th className="px-4 py-3">原料</th>
              <th className="px-4 py-3">分类</th>
              <th className="px-4 py-3">数量</th>
              <th className="px-4 py-3">单价</th>
              <th className="px-4 py-3">金额</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {order.purchase_order_items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium">{item.inventory_items?.name ?? item.item_id}</td>
                <td className="px-4 py-3">
                  <Badge>{item.inventory_items?.category ?? "-"}</Badge>
                </td>
                <td className="px-4 py-3">{formatQty(item.qty, item.inventory_items?.unit)}</td>
                <td className="px-4 py-3">{formatMoney(item.unit_price)}</td>
                <td className="px-4 py-3 font-medium">{formatMoney(item.amount)}</td>
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
