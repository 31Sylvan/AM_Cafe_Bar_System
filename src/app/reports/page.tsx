import { AppShell, PageHeader } from "@/components/app/app-shell";
import { EchartsBar } from "@/components/app/echarts-bar";
import { ExportButton } from "@/components/app/export-button";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { listInventoryBalances } from "@/lib/data/inventory";
import { listEmployeePerformance } from "@/lib/data/staff";
import { listProductSalesReport, listWasteSummary } from "@/lib/data/reports";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const profile = await requireProfile();
  const [inventory, waste, products, employees] = await Promise.all([
    listInventoryBalances(),
    listWasteSummary(),
    listProductSalesReport(),
    profile.role === "owner" ? listEmployeePerformance() : Promise.resolve([]),
  ]);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="报表中心"
        description="库存、损耗、产品和员工报表，基于 PostgreSQL 视图汇总。"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton report="inventory" label="库存" />
            <ExportButton report="products" label="产品" />
            <ExportButton report="waste" label="损耗" />
            {profile.role === "owner" ? <ExportButton report="employees" label="员工" /> : null}
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-md border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">产品利润排行</h2>
          <EchartsBar labels={products.slice(0, 8).map((item) => item.name)} values={products.slice(0, 8).map((item) => Number(item.gross_profit))} name="毛利" />
        </section>
        <section className="rounded-md border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">损耗金额排行</h2>
          <EchartsBar labels={waste.slice(0, 8).map((item) => item.name)} values={waste.slice(0, 8).map((item) => Number(item.waste_amount))} name="损耗金额" />
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-4 font-semibold">库存报表</div>
          <div className="divide-y divide-stone-100">
            {inventory.slice(0, 10).map((item) => (
              <div key={item.item_id} className="flex items-center justify-between p-4 text-sm">
                <div><div className="font-medium">{item.name}</div><div className="text-stone-500">{item.category}</div></div>
                <div className="text-right"><div>{formatQty(item.current_qty, item.unit)}</div><div className="text-stone-500">{formatMoney(item.inventory_value)}</div></div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-4 font-semibold">员工效率排行</div>
          <div className="divide-y divide-stone-100">
            {employees.slice(0, 10).map((employee) => (
              <div key={employee.employee_id} className="flex items-center justify-between p-4 text-sm">
                <div><div className="font-medium">{employee.name}</div><div className="text-stone-500">{employee.total_hours} 小时</div></div>
                <Badge>{formatMoney(employee.revenue_per_hour)} / 小时</Badge>
              </div>
            ))}
            {profile.role !== "owner" ? <div className="p-4 text-sm text-stone-500">员工效率排行仅老板可见。</div> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
