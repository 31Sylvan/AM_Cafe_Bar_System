import { AlertTriangle, Banknote, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { requireProfile } from "@/lib/auth";
import { listInventoryBalances, listInventoryMovements } from "@/lib/data/inventory";
import { listPurchaseOrders } from "@/lib/data/purchases";
import { getDashboardMetrics } from "@/lib/data/dashboard";
import { listProductSalesReport } from "@/lib/data/reports";
import { listEmployeePerformance } from "@/lib/data/staff";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [balances, movements, purchases, products, employees, metrics] = await Promise.all([
    listInventoryBalances(),
    listInventoryMovements(),
    listPurchaseOrders(),
    listProductSalesReport(),
    profile.role === "owner" ? listEmployeePerformance() : Promise.resolve([]),
    getDashboardMetrics(profile.role === "owner"),
  ]);
  const inventoryValue = balances.reduce((sum, item) => sum + Number(item.inventory_value), 0);
  const lowStockCount = balances.filter((item) => item.is_low_stock).length;
  const monthPurchases = purchases.reduce((sum, item) => sum + Number(item.total_amount), 0);

  return (
    <AppShell profile={profile}>
      <PageHeader title="老板驾驶舱" description="库存、销售、损耗、成本、现金流、员工绩效和报表已统一接入经营指标。" />

      <section className="mb-6 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--brand)] p-5 text-white shadow-xl shadow-stone-900/10">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <div className="text-sm font-medium text-[var(--accent-soft)]">Aroma Melody 经营概览</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal md:text-3xl">早咖夜酒的一天，从库存和现金流开始。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-200">
              导入真实订单、采购和配方后，这里会自动汇总营业额、毛利、库存风险和预计利润。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="现金余额" value={profile.role === "owner" ? formatMoney(metrics.cashBalance) : "无权限"} />
            <HeroStat label="预计月利润" value={profile.role === "owner" ? formatMoney(metrics.estimatedMonthProfit) : "无权限"} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric title="今日营业额" value={formatMoney(metrics.todayRevenue)} icon={TrendingUp} tone="green" />
        <Metric title="本月营业额" value={formatMoney(metrics.monthRevenue)} icon={TrendingUp} tone="green" />
        <Metric title="本月毛利率" value={profile.role === "owner" ? `${metrics.grossMargin.toFixed(2)}%` : "无权限"} icon={TrendingUp} tone="gold" />
        <Metric title="原料成本率" value={profile.role === "owner" ? `${metrics.materialCostRate.toFixed(2)}%` : "无权限"} icon={Package} tone="coffee" />
        <Metric title="库存价值" value={formatMoney(inventoryValue)} icon={Package} tone="coffee" />
        <Metric title="库存预警" value={`${lowStockCount}`} icon={AlertTriangle} tone="warning" />
        <Metric title="本月采购额" value={formatMoney(monthPurchases)} icon={ShoppingCart} tone="gold" />
        <Metric title="损耗率" value={profile.role === "owner" ? `${metrics.wasteRate.toFixed(2)}%` : "无权限"} icon={AlertTriangle} tone="warning" />
        <Metric title="现金余额" value={profile.role === "owner" ? formatMoney(metrics.cashBalance) : "无权限"} icon={Banknote} tone="green" />
        <Metric title="预计月利润" value={profile.role === "owner" ? formatMoney(metrics.estimatedMonthProfit) : "无权限"} icon={Banknote} tone="gold" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <section className="app-card rounded-md">
          <div className="app-card-header p-4">
            <h2 className="font-semibold">低库存预警</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {balances.filter((item) => item.is_low_stock).slice(0, 8).map((item) => (
              <div key={item.item_id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-stone-500">{item.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatQty(item.current_qty, item.unit)}</div>
                  <div className="text-stone-500">安全线 {formatQty(item.safe_stock, item.unit)}</div>
                </div>
              </div>
            ))}
            {lowStockCount === 0 ? <div className="p-6 text-sm text-stone-500">暂无库存预警。</div> : null}
          </div>
        </section>

        <section className="app-card rounded-md">
          <div className="app-card-header p-4">
            <h2 className="font-semibold">最近库存流水</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {movements.slice(0, 8).map((movement) => (
              <div key={movement.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <div className="font-medium">{movement.inventory_items?.name ?? "未知原料"}</div>
                  <div className="text-stone-500">{movement.movement_type}</div>
                </div>
                <div className="font-medium">{formatQty(movement.qty, movement.inventory_items?.unit)}</div>
              </div>
            ))}
            {movements.length === 0 ? <div className="p-6 text-sm text-stone-500">暂无库存流水。</div> : null}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Ranking title="产品销量排行榜" rows={products.slice(0, 6).map((item) => ({ label: item.name, value: `${item.sales_qty}` }))} />
        <Ranking title="产品利润排行榜" rows={products.slice(0, 6).map((item) => ({ label: item.name, value: formatMoney(item.gross_profit) }))} />
        <Ranking title="员工效率排行榜" rows={employees.slice(0, 6).map((item) => ({ label: item.name, value: `${formatMoney(item.revenue_per_hour)}/时` }))} />
      </div>
    </AppShell>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: typeof TrendingUp;
  tone: "green" | "gold" | "coffee" | "warning";
}) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700",
    gold: "bg-[var(--accent-soft)] text-[var(--accent)]",
    coffee: "bg-stone-100 text-stone-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="app-card rounded-md p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-stone-500">{title}</div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-normal text-stone-950">{value}</div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/15 bg-white/10 p-4">
      <div className="text-xs text-stone-300">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Ranking({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <section className="app-card rounded-md">
      <div className="app-card-header p-4 font-semibold">{title}</div>
      <div className="divide-y divide-[var(--line)]">
        {rows.length === 0 ? <div className="p-4 text-sm text-stone-500">暂无数据</div> : null}
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex items-center justify-between p-4 text-sm">
            <div className="flex min-w-0 items-center gap-3 font-medium">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-xs text-[var(--brand)]">{index + 1}</span>
              <span className="truncate">{row.label}</span>
            </div>
            <div className="text-stone-500">{row.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
