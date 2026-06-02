import Link from "next/link";
import { Link2, Trash2 } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createProductAliasAction, deleteProductAliasAction } from "@/lib/actions/products";
import { requirePermission, requireProfile } from "@/lib/auth";
import { listProductAliases, listProducts } from "@/lib/data/products";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductAliasesPage() {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");
  const [products, aliases] = await Promise.all([listProducts(), listProductAliases()]);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="商品别名映射"
        description="把真实订单里的商品名映射到系统产品，导入销售时会自动按映射匹配。"
        action={
          <Button asChild variant="secondary">
            <Link href="/products">返回产品</Link>
          </Button>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <form action={createProductAliasAction} className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">新增别名</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alias_name">订单商品名</Label>
              <Input id="alias_name" name="alias_name" placeholder="例如 橙C美式" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_id">映射到系统产品</Label>
              <Select id="product_id" name="product_id" required>
                <option value="">请选择产品</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} / {product.category} / {formatMoney(product.sale_price)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">来源备注</Label>
              <Input id="source" name="source" placeholder="例如 小程序订单、收银台" />
            </div>
          </div>
          <Button className="mt-5 w-full">
            <Link2 className="h-4 w-4" />
            保存映射
          </Button>
        </form>

        {aliases.length === 0 ? (
          <EmptyState title="暂无商品别名" description="当真实订单商品名和系统产品名不一致时，在这里建立映射。" />
        ) : (
          <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-stone-100 text-xs font-medium text-stone-500">
                <tr>
                  <th className="px-4 py-3">订单商品名</th>
                  <th className="px-4 py-3">系统产品</th>
                  <th className="px-4 py-3">分类</th>
                  <th className="px-4 py-3">售价</th>
                  <th className="px-4 py-3">来源</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {aliases.map((alias) => (
                  <tr key={alias.id}>
                    <td className="px-4 py-3 font-medium">{alias.alias_name}</td>
                    <td className="px-4 py-3">{alias.products?.name ?? "产品已删除"}</td>
                    <td className="px-4 py-3">
                      {alias.products?.category ? <Badge>{alias.products.category}</Badge> : null}
                    </td>
                    <td className="px-4 py-3">{alias.products ? formatMoney(alias.products.sale_price) : "-"}</td>
                    <td className="px-4 py-3 text-stone-500">{alias.source ?? "-"}</td>
                    <td className="px-4 py-3">
                      <form action={deleteProductAliasAction}>
                        <input type="hidden" name="alias_id" value={alias.id} />
                        <Button variant="secondary" size="sm">
                          <Trash2 className="h-4 w-4" />
                          删除
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
