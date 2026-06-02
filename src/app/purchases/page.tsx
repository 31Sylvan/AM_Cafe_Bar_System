import Link from "next/link";
import { Plus } from "lucide-react";
import { FilterBar } from "@/components/app/filter-bar";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { voidPurchaseOrderAction } from "@/lib/actions/purchases";
import { requireProfile } from "@/lib/auth";
import { listPurchaseOrders } from "@/lib/data/purchases";
import { cleanSearchParam } from "@/lib/filters";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const from = cleanSearchParam(params.from);
  const to = cleanSearchParam(params.to);
  const status = cleanSearchParam(params.status);
  const orders = await listPurchaseOrders({ from, to, status: status === "draft" || status === "completed" || status === "void" ? status : "all" });

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="采购管理"
        description="支持多明细采购单入库，完成后自动生成库存流水和现金支出。"
        action={
          <Button asChild>
            <Link href="/purchases/new">
              <Plus className="h-4 w-4" />
              新建采购
            </Link>
          </Button>
        }
      />
      <FilterBar
        action="/purchases"
        from={from}
        to={to}
        selectName="status"
        selectLabel="状态"
        selectValue={status}
        selectOptions={[
          { value: "all", label: "全部" },
          { value: "draft", label: "草稿" },
          { value: "completed", label: "已入库" },
          { value: "void", label: "已作废" },
        ]}
      />
      {orders.length === 0 ? (
        <EmptyState title="暂无采购单" description="录入采购后会自动生成库存流水，并更新库存余额。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">供应商</th>
                <th className="px-4 py-3">金额</th>
                <th className="px-4 py-3">付款</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">{order.purchase_date}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/purchases/${order.id}`} className="text-emerald-700 hover:underline">
                      {order.supplier}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatMoney(order.total_amount)}</td>
                  <td className="px-4 py-3">{order.payment_method}</td>
                  <td className="px-4 py-3">
                    <Badge className={order.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : undefined}>
                      {order.status === "completed" ? "已入库" : order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{new Date(order.created_at).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    {profile.role === "owner" && order.status === "completed" ? (
                      <form action={voidPurchaseOrderAction}>
                        <input type="hidden" name="purchase_order_id" value={order.id} />
                        <Button variant="secondary" size="sm">作废</Button>
                      </form>
                    ) : (
                      <span className="text-stone-400">-</span>
                    )}
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
