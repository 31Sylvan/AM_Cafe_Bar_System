import Link from "next/link";
import { Link2, Plus } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { listProductCosts } from "@/lib/data/products";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const profile = await requireProfile();
  const products = await listProductCosts();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="产品与配方"
        description="产品售价和配方会自动计算理论成本、理论毛利和毛利率。"
        action={
          profile.role === "owner" ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href="/products/aliases">
                  <Link2 className="h-4 w-4" />
                  别名映射
                </Link>
              </Button>
              <Button asChild>
                <Link href="/products/new">
                  <Plus className="h-4 w-4" />
                  新建产品
                </Link>
              </Button>
            </div>
          ) : null
        }
      />
      {products.length === 0 ? (
        <EmptyState title="暂无产品" description="先创建拿铁、Gin Tonic 等产品，再为产品维护配方。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">产品</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">售价</th>
                <th className="px-4 py-3">理论成本</th>
                <th className="px-4 py-3">理论毛利</th>
                <th className="px-4 py-3">毛利率</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((product) => (
                <tr key={product.product_id}>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3">{formatMoney(product.sale_price)}</td>
                  <td className="px-4 py-3">{formatMoney(product.theoretical_cost)}</td>
                  <td className="px-4 py-3">{formatMoney(product.theoretical_gross_profit)}</td>
                  <td className="px-4 py-3">
                    <Badge>{product.theoretical_gross_margin}%</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-emerald-700 hover:text-emerald-900" href={`/products/${product.product_id}`}>
                      配方
                    </Link>
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
