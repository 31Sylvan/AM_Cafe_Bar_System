import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePermission, requireProfile } from "@/lib/auth";
import { previewRecipeWorkbook } from "@/lib/imports/business-xls";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProductLookup = { id: string; name: string };
type ItemLookup = { id: string; name: string; unit: string };

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(request: Request) {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "请上传配方导入表" }, { status: 400 });
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "配方导入表不能超过 3MB" }, { status: 400 });
  }

  const preview = await previewRecipeWorkbook(file);

  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      mode: "demo",
      importableCount: preview.importableCount,
      skippedCount: preview.skippedCount,
      replacedProductCount: 0,
      recipeLineCount: 0,
      simulatedCount: preview.importableCount,
      warnings: ["当前为本地 Demo 模式：已完成配方导入校验，但不会写入真实数据库。", ...preview.warnings],
    });
  }

  const supabase = await createClient();
  const [{ data: products, error: productError }, { data: items, error: itemError }] = await Promise.all([
    supabase.from("products").select("id, name").eq("store_id", profile.store_id),
    supabase.from("inventory_items").select("id, name, unit").eq("store_id", profile.store_id),
  ]);

  if (productError) throw new Error(productError.message);
  if (itemError) throw new Error(itemError.message);

  const productByName = new Map((products as ProductLookup[] | null ?? []).map((product) => [normalizeName(product.name), product]));
  const itemByName = new Map((items as ItemLookup[] | null ?? []).map((item) => [normalizeName(item.name), item]));

  const missingProducts = Array.from(new Set(preview.lines.map((line) => line.product_name).filter((name) => !productByName.has(normalizeName(name)))))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  const missingItems = Array.from(new Set(preview.lines.map((line) => line.item_name).filter((name) => !itemByName.has(normalizeName(name)))))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  const unitMismatches = preview.lines
    .map((line) => {
      const item = itemByName.get(normalizeName(line.item_name));
      return item && item.unit !== line.unit ? `${line.product_name} / ${line.item_name}: 表格 ${line.unit}，库存 ${item.unit}` : null;
    })
    .filter((item): item is string => Boolean(item));

  if (missingProducts.length > 0 || missingItems.length > 0 || unitMismatches.length > 0) {
    return NextResponse.json(
      {
        error: "配方导入已停止：请先修正产品、原料或单位匹配问题。",
        missingProducts,
        missingItems,
        unitMismatches,
        importableCount: preview.importableCount,
        skippedCount: preview.skippedCount,
        warnings: preview.warnings,
      },
      { status: 422 },
    );
  }

  const lineByProductItem = new Map<string, { product_id: string; item_id: string; qty: number; unit: string }>();
  const duplicateWarnings: string[] = [];

  for (const line of preview.lines) {
    const product = productByName.get(normalizeName(line.product_name));
    const item = itemByName.get(normalizeName(line.item_name));
    if (!product || !item) continue;

    const key = `${product.id}__${item.id}`;
    const existing = lineByProductItem.get(key);
    if (existing) {
      existing.qty = Number((existing.qty + line.qty).toFixed(3));
      duplicateWarnings.push(`${line.product_name} / ${line.item_name} 重复出现，已合并用量。`);
      continue;
    }

    lineByProductItem.set(key, {
      product_id: product.id,
      item_id: item.id,
      qty: line.qty,
      unit: line.unit,
    });
  }

  const productIds = Array.from(new Set(Array.from(lineByProductItem.values()).map((line) => line.product_id)));

  const { error: deleteError } = await supabase
    .from("recipes")
    .delete()
    .eq("store_id", profile.store_id)
    .in("product_id", productIds);

  if (deleteError) throw new Error(deleteError.message);

  const recipeRows = Array.from(lineByProductItem.values()).map((line) => ({
    store_id: profile.store_id,
    ...line,
  }));

  if (recipeRows.length > 0) {
    const { error: insertError } = await supabase.from("recipes").insert(recipeRows);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/products");
  revalidatePath("/quality");
  revalidatePath("/imports/orders");

  return NextResponse.json({
    mode: "supabase",
    importableCount: preview.importableCount,
    skippedCount: preview.skippedCount,
    replacedProductCount: productIds.length,
    recipeLineCount: recipeRows.length,
    simulatedCount: 0,
    warnings: [...preview.warnings, ...Array.from(new Set(duplicateWarnings)).slice(0, 20)],
  });
}
