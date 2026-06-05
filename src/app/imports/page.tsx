import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, requireProfile } from "@/lib/auth";
import { ImportValidator } from "./import-validator";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader title="导入预检" description="上传 CSV 后只做格式、必填项、枚举值和重复项检查，不会写入数据库。" />
      <section className="mb-5 rounded-md border border-violet-200 bg-violet-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-violet-950">V3 真实数据试运行</h2>
            <p className="mt-1 text-sm text-violet-900">先看导入就绪状态，再查看每次商品、库存、采购、配方和订单导入的结果。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/imports/readiness">查看试运行看板</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/imports/validation">真实数据验收</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/imports/history">查看导入历史</Link>
            </Button>
          </div>
        </div>
      </section>
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
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>经营数据导入</CardTitle>
          <CardDescription>先导入库存、采购和配方，再导入订单，系统才能完整联动销售、库存和财务。</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-[#e7d9c8] bg-white/65 p-4">
            <h2 className="font-semibold text-stone-950">库存管理表导入</h2>
            <p className="mt-1 min-h-10 text-sm text-stone-600">建立原料档案、成本、安全库存，并可用实际库存生成盘点调整。</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/imports/inventory">进入库存导入</Link>
            </Button>
          </div>
          <div className="rounded-md border border-[#e7d9c8] bg-white/65 p-4">
            <h2 className="font-semibold text-stone-950">采购表导入</h2>
            <p className="mt-1 min-h-10 text-sm text-stone-600">按供应商、日期和付款方式生成采购单，同步库存入库与现金支出。</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/imports/purchases">进入采购导入</Link>
            </Button>
          </div>
          <div className="rounded-md border border-[#e7d9c8] bg-white/65 p-4">
            <h2 className="font-semibold text-stone-950">配方表导入</h2>
            <p className="mt-1 min-h-10 text-sm text-stone-600">批量维护产品配方，为订单导入后的自动扣库存和毛利计算打底。</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/imports/recipes">进入配方导入</Link>
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>
      <ImportValidator />
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>标准模板</CardTitle>
          <CardDescription>下载模板后按字段填入真实数据，再回到对应导入页上传。</CardDescription>
        </CardHeader>
        <CardContent>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/inventory-items" prefetch={false}>原料模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/inventory-import" prefetch={false}>库存导入模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/products" prefetch={false}>产品模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/recipes" prefetch={false}>配方模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/employees" prefetch={false}>员工模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/purchases" prefetch={false}>采购明细模板</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/api/templates/sales-batch" prefetch={false}>销售批量模板</Link></Button>
        </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
