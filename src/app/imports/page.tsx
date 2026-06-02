import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { requireOwner, requireProfile } from "@/lib/auth";
import { ImportValidator } from "./import-validator";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const profile = await requireProfile();
  requireOwner(profile);

  return (
    <AppShell profile={profile}>
      <PageHeader title="导入预检" description="上传 CSV 后只做格式、必填项、枚举值和重复项检查，不会写入数据库。" />
      <section className="mb-5 rounded-md border border-sky-200 bg-sky-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-sky-950">商品导出表接入</h2>
            <p className="mt-1 text-sm text-sky-900">导入门店商品表，建立系统产品档案，为真实订单导入和利润分析打底。</p>
          </div>
          <Button asChild>
            <Link href="/imports/products">进入商品接入</Link>
          </Button>
        </div>
      </section>
      <section className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-emerald-950">真实订单 Excel 接入</h2>
            <p className="mt-1 text-sm text-emerald-900">支持上传每月店内订单和自提订单表，自动转换为标准销售批量 CSV，并可用商品别名映射解决真实商品名差异。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/products/aliases">商品别名映射</Link>
            </Button>
            <Button asChild>
              <Link href="/imports/orders">进入订单接入</Link>
            </Button>
          </div>
        </div>
      </section>
      <ImportValidator />
      <section className="mt-5 rounded-md border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">标准模板</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/inventory-items" prefetch={false}>原料模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/products" prefetch={false}>产品模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/employees" prefetch={false}>员工模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/purchases" prefetch={false}>采购明细模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/sales-batch" prefetch={false}>销售批量模板</Link></Button>
        </div>
      </section>
    </AppShell>
  );
}
