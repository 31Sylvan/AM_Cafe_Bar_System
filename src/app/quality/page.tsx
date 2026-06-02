import Link from "next/link";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireOwner, requireProfile } from "@/lib/auth";
import { listNegativeInventoryBalances, listProductsWithoutRecipe } from "@/lib/data/quality";
import { listInventoryBalances } from "@/lib/data/inventory";
import { formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QualityPage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const [withoutRecipe, negativeStock, balances] = await Promise.all([
    listProductsWithoutRecipe(),
    listNegativeInventoryBalances(),
    listInventoryBalances(),
  ]);
  const lowStock = balances.filter((item) => item.is_low_stock);
  const issueCount = withoutRecipe.length + negativeStock.length + lowStock.length;

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="经营异常中心"
        description="集中检查产品配方、库存异常、低库存风险和待处理运营动作。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/inventory/replenishment">补货建议</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/backup">数据备份</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Metric label="异常总数" value={`${issueCount}`} tone={issueCount > 0 ? "warn" : "ok"} />
        <Metric label="缺配方产品" value={`${withoutRecipe.length}`} tone={withoutRecipe.length > 0 ? "warn" : "ok"} />
        <Metric label="负库存" value={`${negativeStock.length}`} tone={negativeStock.length > 0 ? "danger" : "ok"} />
        <Metric label="低库存" value={`${lowStock.length}`} tone={lowStock.length > 0 ? "warn" : "ok"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <QualityPanel title="未配置配方产品" count={withoutRecipe.length}>
          {withoutRecipe.length === 0 ? (
            <EmptyState title="产品配方完整" description="所有启用产品都已经配置至少一条配方。" />
          ) : (
            withoutRecipe.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="flex items-center justify-between border-t border-stone-100 p-4 text-sm hover:bg-stone-50">
                <div><div className="font-medium">{product.name}</div><div className="text-stone-500">{product.category}</div></div>
                <Badge>去配置</Badge>
              </Link>
            ))
          )}
        </QualityPanel>

        <QualityPanel title="负库存异常" count={negativeStock.length}>
          {negativeStock.length === 0 ? (
            <EmptyState title="没有负库存" description="库存流水聚合结果均不低于 0。" />
          ) : (
            negativeStock.map((item) => (
              <div key={item.item_id} className="flex items-center justify-between border-t border-stone-100 p-4 text-sm">
                <div><div className="font-medium">{item.name}</div><div className="text-stone-500">{item.category}</div></div>
                <Badge className="border-red-200 bg-red-50 text-red-700">{formatQty(item.current_qty, item.unit)}</Badge>
              </div>
            ))
          )}
        </QualityPanel>

        <QualityPanel title="低库存预警" count={lowStock.length}>
          {lowStock.length === 0 ? (
            <EmptyState title="没有低库存" description="所有原料都高于安全库存线。" />
          ) : (
            lowStock.slice(0, 12).map((item) => (
              <div key={item.item_id} className="flex items-center justify-between border-t border-stone-100 p-4 text-sm">
                <div><div className="font-medium">{item.name}</div><div className="text-stone-500">安全线 {formatQty(item.safe_stock, item.unit)}</div></div>
                <Badge className="border-amber-200 bg-amber-50 text-amber-800">{formatQty(item.current_qty, item.unit)}</Badge>
              </div>
            ))
          )}
        </QualityPanel>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "danger" }) {
  const color = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-700",
  }[tone];

  return (
    <div className={`rounded-md border p-4 ${color}`}>
      <div className="text-sm opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function QualityPanel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-200 p-4">
        <h2 className="font-semibold">{title}</h2>
        <Badge>{count}</Badge>
      </div>
      {children}
    </section>
  );
}
