import { redirect } from "next/navigation";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { addRecipeItemAction } from "@/lib/actions/products";
import { requirePermission, requireProfile } from "@/lib/auth";
import { listInventoryItems } from "@/lib/data/inventory";
import { getProduct, listRecipe } from "@/lib/data/products";
import { formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

const postgresUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export default async function ProductRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!postgresUuid.test(id)) {
    redirect("/products");
  }

  const profile = await requireProfile();
  requirePermission(profile, "product.manage");
  const [product, recipe, items] = await Promise.all([getProduct(id), listRecipe(id), listInventoryItems()]);

  if (!product) {
    redirect("/products");
  }

  return (
    <AppShell profile={profile}>
      <PageHeader title={`${product.name} 配方`} description="配方单位必须和库存原料单位一致，数据库会强制校验。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-4 font-semibold">当前配方</div>
          {recipe.length === 0 ? (
            <div className="p-4">
              <EmptyState title="还没有配方" description="添加咖啡豆、牛奶、酒类等原料后，销售录入才能自动扣库存。" />
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recipe.map((line) => (
                <div key={line.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <div className="font-medium">{line.inventory_items?.name ?? line.item_id}</div>
                    <div className="text-stone-500">{line.inventory_items?.category}</div>
                  </div>
                  <div className="font-medium">{formatQty(line.qty, line.unit)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <form action={addRecipeItemAction} className="rounded-md border border-stone-200 bg-white p-5">
          <input type="hidden" name="product_id" value={product.id} />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item_id">原料</Label>
              <Select id="item_id" name="item_id" required>
                <option value="">选择原料</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} / {item.unit}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">用量</Label>
              <Input id="qty" name="qty" type="number" min="0.001" step="0.001" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">单位</Label>
              <Select id="unit" name="unit" required>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="pcs">pcs</option>
              </Select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button>添加配方原料</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
