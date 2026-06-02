import Link from "next/link";
import { Plus } from "lucide-react";
import { FilterBar } from "@/components/app/filter-bar";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { voidSaleOrderAction } from "@/lib/actions/operations";
import { requireProfile } from "@/lib/auth";
import { listSalesOrders } from "@/lib/data/operations";
import { cleanSearchParam } from "@/lib/filters";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const from = cleanSearchParam(params.from);
  const to = cleanSearchParam(params.to);
  const status = cleanSearchParam(params.status);
  const orders = await listSalesOrders({ from, to, status: status === "completed" || status === "void" ? status : "all" });

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="销售管理"
        description="V1 支持手工录入销售，提交后按配方自动扣减库存。"
        action={
          <Button asChild>
            <Link href="/sales/new">
              <Plus className="h-4 w-4" />
              录入销售
            </Link>
          </Button>
        }
      />
      <FilterBar
        action="/sales"
        from={from}
        to={to}
        selectName="status"
        selectLabel="状态"
        selectValue={status}
        selectOptions={[
          { value: "all", label: "全部" },
          { value: "completed", label: "已完成" },
          { value: "void", label: "已作废" },
        ]}
      />
      {orders.length === 0 ? (
        <EmptyState title="暂无销售记录" description="录入销售后会自动根据配方扣减库存流水。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">渠道</th>
                <th className="px-4 py-3">收款方式</th>
                <th className="px-4 py-3">金额</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <Link href={`/sales/${order.id}`} className="text-emerald-700 hover:underline">
                      {order.sale_date}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{order.channel}</Badge>
                  </td>
                  <td className="px-4 py-3">{order.payment_method}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(order.total_amount)}</td>
                  <td className="px-4 py-3">
                    <Badge className={order.status === "void" ? "border-red-200 bg-red-50 text-red-700" : undefined}>
                      {order.status === "void" ? "已作废" : "已完成"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{new Date(order.created_at).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    {profile.role === "owner" && order.status !== "void" ? (
                      <form action={voidSaleOrderAction}>
                        <input type="hidden" name="sales_order_id" value={order.id} />
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
