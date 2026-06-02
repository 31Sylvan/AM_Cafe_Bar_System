import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createProductAction } from "@/lib/actions/products";
import { requirePermission, requireProfile } from "@/lib/auth";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader title="新建产品" description="产品创建后进入详情页维护配方，系统会计算理论成本。" />
      <form action={createProductAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">产品名称</Label>
            <Input id="name" name="name" placeholder="例如 拿铁" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Select id="category" name="category" defaultValue="咖啡" required>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale_price">售价</Label>
            <Input id="sale_price" name="sale_price" type="number" min="0" step="0.01" required />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button>保存产品</Button>
        </div>
      </form>
    </AppShell>
  );
}
