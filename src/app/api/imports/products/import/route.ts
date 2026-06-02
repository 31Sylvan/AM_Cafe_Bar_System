import { NextResponse } from "next/server";
import { requirePermission, requireProfile } from "@/lib/auth";
import { previewProductCatalogWorkbook } from "@/lib/imports/product-xls";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "请上传商品导出 Excel 文件" }, { status: 400 });
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "商品文件不能超过 3MB" }, { status: 400 });
  }

  const preview = await previewProductCatalogWorkbook(file);

  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      mode: "demo",
      totalRows: preview.totalRows,
      importableCount: preview.importableCount,
      skippedCount: preview.skippedCount,
      activeCount: preview.activeCount,
      inactiveCount: preview.inactiveCount,
      upsertedCount: 0,
      simulatedCount: preview.importableCount,
      warnings: ["当前为本地 Demo 模式：已完成商品导入校验，但不会写入真实数据库。连接 Supabase 后可正式入库。", ...preview.warnings],
    });
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("products").upsert(
    preview.products.map((product) => ({
      store_id: profile.store_id,
      name: product.name,
      category: product.category,
      sale_price: product.sale_price,
      status: product.status,
      description: product.description || null,
      source_category: product.source_category || null,
      source_channels: product.source_channels || null,
      image_url: product.image_url || null,
      external_sort: product.external_sort,
      external_store_id: product.external_store_id || null,
      imported_at: now,
    })),
    { onConflict: "store_id,name" },
  );

  if (error) throw new Error(error.message);

  return NextResponse.json({
    mode: "supabase",
    totalRows: preview.totalRows,
    importableCount: preview.importableCount,
    skippedCount: preview.skippedCount,
    activeCount: preview.activeCount,
    inactiveCount: preview.inactiveCount,
    upsertedCount: preview.importableCount,
    simulatedCount: 0,
    warnings: preview.warnings,
  });
}
