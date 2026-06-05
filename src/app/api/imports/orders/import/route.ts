import { NextResponse } from "next/server";
import { requirePermission, requireProfile } from "@/lib/auth";
import { recordFailedImportBatch, recordImportBatch, recordImportBatchIssues } from "@/lib/data/import-batches";
import { demoProducts, demoRecipes } from "@/lib/demo-data";
import { previewOrderWorkbooks, type NormalizedOrderLine } from "@/lib/imports/order-xls";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type ProductLookup = Pick<Product, "id" | "name" | "sale_price">;

type ProductAliasLookup = {
  alias_name: string;
  products: ProductLookup | ProductLookup[] | null;
};

type OrderGroup = {
  externalOrderNo: string;
  displayOrderNo: string;
  saleDate: string;
  channel: NormalizedOrderLine["channel"];
  paymentMethod: NormalizedOrderLine["payment_method"];
  source: string;
  orderAmount: number;
  lines: NormalizedOrderLine[];
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function groupOrderLines(lines: NormalizedOrderLine[]) {
  const groups = new Map<string, OrderGroup>();

  for (const line of lines) {
    const externalOrderNo = `${line.source}/${line.order_no}`;
    const existing = groups.get(externalOrderNo);

    if (existing) {
      existing.lines.push(line);
      continue;
    }

    groups.set(externalOrderNo, {
      externalOrderNo,
      displayOrderNo: line.order_no,
      saleDate: line.sale_date,
      channel: line.channel,
      paymentMethod: line.payment_method,
      source: line.source,
      orderAmount: line.order_amount,
      lines: [line],
    });
  }

  return Array.from(groups.values());
}

function aliasProduct(alias: ProductAliasLookup) {
  if (Array.isArray(alias.products)) return alias.products[0] ?? null;
  return alias.products;
}

function allocateImportItems(group: OrderGroup, productByName: Map<string, ProductLookup>) {
  const lineProducts = group.lines.map((line) => {
    const product = productByName.get(normalizeName(line.product_name));
    if (!product) throw new Error(`Product not matched: ${line.product_name}`);
    return {
      line,
      product,
      listAmount: Number(product.sale_price) * line.qty,
    };
  });

  const listTotal = lineProducts.reduce((sum, item) => sum + item.listAmount, 0);
  let remainingAmount = Math.round(group.orderAmount * 100);

  return lineProducts.map((item, index) => {
    const isLast = index === lineProducts.length - 1;
    const amountCents = isLast
      ? remainingAmount
      : Math.round((group.orderAmount * 100 * item.listAmount) / Math.max(listTotal, group.orderAmount, 1));

    remainingAmount -= amountCents;

    return {
      product_id: item.product.id,
      qty: item.line.qty,
      unit_price: Number((amountCents / 100 / item.line.qty).toFixed(2)),
    };
  });
}

export async function POST(request: Request) {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  const formData = await request.formData();
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "请上传至少一个订单 Excel 文件" }, { status: 400 });
  }

  if (files.some((file) => file.size > 2 * 1024 * 1024)) {
    return NextResponse.json({ error: "单个订单文件不能超过 2MB" }, { status: 400 });
  }

  const preview = await previewOrderWorkbooks(files);
  const groups = groupOrderLines(preview.lines);

  const productNames = Array.from(new Set(preview.lines.map((line) => normalizeName(line.product_name))));
  let products: ProductLookup[] = [];
  let aliases: ProductAliasLookup[] = [];

  if (!hasSupabaseEnv()) {
    products = demoProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sale_price: product.sale_price,
    }));
    aliases = [];
  } else {
    const supabase = await createClient();
    const [{ data, error }, { data: aliasData, error: aliasError }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, sale_price")
        .eq("store_id", profile.store_id)
        .eq("status", "active"),
      supabase
        .from("product_aliases")
        .select("alias_name, products(id, name, sale_price)")
        .eq("store_id", profile.store_id),
    ]);

    if (error) throw new Error(error.message);
    if (aliasError) throw new Error(aliasError.message);
    products = data ?? [];
    aliases = (aliasData ?? []) as unknown as ProductAliasLookup[];
  }

  const productByName = new Map(products.map((product) => [normalizeName(product.name), product]));
  for (const alias of aliases) {
    const product = aliasProduct(alias);
    if (product) {
      productByName.set(normalizeName(alias.alias_name), product);
    }
  }
  const missingProducts = productNames
    .filter((name) => !productByName.has(name))
    .map((name) => preview.lines.find((line) => normalizeName(line.product_name) === name)?.product_name ?? name)
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  if (missingProducts.length > 0) {
    const batch = await recordFailedImportBatch(profile, {
      import_type: "orders",
      source_file: files.map((file) => file.name).join(", "),
      total_rows: preview.lineCount,
      skipped_rows: preview.skippedCount,
      warning_count: preview.warnings.length + missingProducts.length,
      error_message: `订单导入已停止：商品未匹配 ${missingProducts.join("、")}`,
    });
    await recordImportBatchIssues(
      profile,
      batch?.id,
      missingProducts.map((name) => ({
        severity: "error",
        issue_type: "product_not_matched",
        entity_name: name,
        message: `订单商品「${name}」未匹配到系统产品，请在商品别名映射中绑定后重新导入。`,
      })),
    );

    return NextResponse.json(
      {
        error: "有订单商品尚未匹配到系统产品，已停止导入。",
        missingProducts,
        orderCount: preview.orderCount,
        lineCount: preview.lineCount,
        skippedCount: preview.skippedCount,
        totalPaidAmount: preview.totalPaidAmount,
        warnings: preview.warnings,
      },
      { status: 422 },
    );
  }

  const matchedProducts = Array.from(
    new Map(
      preview.lines.map((line) => {
        const product = productByName.get(normalizeName(line.product_name));
        return [product?.id, product] as const;
      }),
    ).values(),
  ).filter((product): product is ProductLookup => Boolean(product));
  const matchedProductIds = matchedProducts.map((product) => product.id);
  let recipeProductIds = new Set<string>();

  if (!hasSupabaseEnv()) {
    recipeProductIds = new Set(demoRecipes.map((recipe) => recipe.product_id));
  } else if (matchedProductIds.length > 0) {
    const supabase = await createClient();
    const { data: recipeRows, error: recipeError } = await supabase
      .from("recipes")
      .select("product_id")
      .eq("store_id", profile.store_id)
      .in("product_id", matchedProductIds);

    if (recipeError) throw new Error(recipeError.message);
    recipeProductIds = new Set((recipeRows ?? []).map((recipe) => recipe.product_id as string));
  }

  const missingRecipes = matchedProducts
    .filter((product) => !recipeProductIds.has(product.id))
    .map((product) => product.name)
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  if (missingRecipes.length > 0) {
    const batch = await recordFailedImportBatch(profile, {
      import_type: "orders",
      source_file: files.map((file) => file.name).join(", "),
      total_rows: preview.lineCount,
      skipped_rows: preview.skippedCount,
      warning_count: preview.warnings.length + missingRecipes.length,
      error_message: `订单导入已停止：产品缺少配方 ${missingRecipes.join("、")}`,
    });
    await recordImportBatchIssues(
      profile,
      batch?.id,
      missingRecipes.map((name) => ({
        severity: "error",
        issue_type: "recipe_missing",
        entity_name: name,
        message: `产品「${name}」缺少配方，补齐后订单导入才能自动扣库存和计算理论成本。`,
      })),
    );

    return NextResponse.json(
      {
        error: "有订单商品尚未维护配方，已停止导入。请先补齐配方，确保销售导入后库存能同步扣减。",
        missingRecipes,
        orderCount: preview.orderCount,
        lineCount: preview.lineCount,
        skippedCount: preview.skippedCount,
        totalPaidAmount: preview.totalPaidAmount,
        warnings: preview.warnings,
      },
      { status: 422 },
    );
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      mode: "demo",
      orderCount: preview.orderCount,
      lineCount: preview.lineCount,
      skippedCount: preview.skippedCount,
      totalPaidAmount: preview.totalPaidAmount,
      importedCount: 0,
      duplicateCount: 0,
      simulatedCount: groups.length,
      warnings: ["当前为本地 Demo 模式：已完成导入校验，但不会写入真实数据库。连接 Supabase 后可正式入库。", ...preview.warnings],
      importedOrderIds: [],
      duplicateOrderNos: [],
    });
  }

  const supabase = await createClient();
  const externalOrderNos = groups.map((group) => group.externalOrderNo);
  const { data: existingOrders, error: existingError } = await supabase
    .from("sales_orders")
    .select("external_order_no")
    .eq("store_id", profile.store_id)
    .in("external_order_no", externalOrderNos);

  if (existingError) throw new Error(existingError.message);

  const duplicateOrderNos = new Set((existingOrders ?? []).map((order) => order.external_order_no as string));
  const importedOrderIds: string[] = [];

  for (const group of groups) {
    if (duplicateOrderNos.has(group.externalOrderNo)) continue;

    const items = allocateImportItems(group, productByName);
    const { data, error } = await supabase.rpc("import_sales_order", {
      p_external_order_no: group.externalOrderNo,
      p_sale_date: group.saleDate,
      p_channel: group.channel,
      p_payment_method: group.paymentMethod,
      p_import_source: group.source,
      p_items: items,
    });

    if (error) throw new Error(error.message);
    if (data?.id) importedOrderIds.push(data.id);
  }

  const batch = await recordImportBatch(profile, {
    import_type: "orders",
    source_file: files.map((file) => file.name).join(", "),
    status: "completed",
    total_rows: preview.lineCount,
    imported_rows: importedOrderIds.length,
    skipped_rows: preview.skippedCount + duplicateOrderNos.size,
    warning_count: preview.warnings.length,
  });
  await recordImportBatchIssues(profile, batch?.id, [
    ...preview.warnings.map((warning) => ({
      severity: "warning" as const,
      issue_type: "preview_warning",
      entity_name: "订单导入",
      message: warning,
    })),
    ...Array.from(duplicateOrderNos).map((orderNo) => ({
      severity: "info" as const,
      issue_type: "duplicate_order",
      entity_name: orderNo,
      message: `订单「${orderNo}」已存在，本次自动跳过。`,
    })),
  ]);

  return NextResponse.json({
    mode: "supabase",
    orderCount: preview.orderCount,
    lineCount: preview.lineCount,
    skippedCount: preview.skippedCount,
    totalPaidAmount: preview.totalPaidAmount,
    importedCount: importedOrderIds.length,
    duplicateCount: duplicateOrderNos.size,
    simulatedCount: 0,
    warnings: preview.warnings,
    importedOrderIds,
    duplicateOrderNos: Array.from(duplicateOrderNos),
  });
}
