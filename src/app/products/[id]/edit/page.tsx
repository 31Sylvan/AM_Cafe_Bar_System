import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateProductAction } from "@/lib/actions/products";
import { requirePermission, requireProfile } from "@/lib/auth";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { getProduct } from "@/lib/data/products";

export const dynamic = "force-dynamic";

const postgresUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!postgresUuid.test(id)) redirect("/products");

  const profile = await requireProfile();
  requirePermission(profile, "product.manage");
  const product = await getProduct(id);
  if (!product) redirect("/products");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title={`编辑产品 · ${product.name}`}
        description="修改产品名称、分类和售价。配方请回到配方页维护。"
        action={<Button asChild variant="secondary"><Link href="/products">返回产品列表</Link></Button>}
      />
      <form action={updateProductAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <input type="hidden" name="product_id" value={product.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">产品名称</Label>
            <Input id="name" name="name" defaultValue={product.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Select id="category" name="category" defaultValue={product.category} required>
              {PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale_price">售价</Label>
            <Input id="sale_price" name="sale_price" type="number" min="0" step="0.01" defaultValue={product.sale_price} required />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button>保存修改</Button>
        </div>
      </form>
    </AppShell>
  );
}
