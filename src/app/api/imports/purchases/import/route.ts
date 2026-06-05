import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePermission, requireProfile } from "@/lib/auth";
import { recordFailedImportBatch, recordImportBatch, recordImportBatchIssues } from "@/lib/data/import-batches";
import { previewPurchaseWorkbook, type NormalizedPurchaseImportLine } from "@/lib/imports/business-xls";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function groupPurchases(lines: NormalizedPurchaseImportLine[]) {
  const groups = new Map<string, NormalizedPurchaseImportLine[]>();
  for (const line of lines) {
    const key = `${line.supplier}__${line.purchase_date}__${line.payment_method}`;
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  return Array.from(groups.values());
}

export async function POST(request: Request) {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "请上传采购导入表" }, { status: 400 });
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "采购导入表不能超过 3MB" }, { status: 400 });
  }

  const preview = await previewPurchaseWorkbook(file);
  const groups = groupPurchases(preview.lines);

  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      mode: "demo",
      importableCount: preview.importableCount,
      skippedCount: preview.skippedCount,
      purchaseOrderCount: 0,
      simulatedCount: groups.length,
      totalAmount: preview.lines.reduce((sum, line) => sum + line.amount, 0),
      warnings: ["当前为本地 Demo 模式：已完成采购导入校验，但不会写入真实数据库。", ...preview.warnings],
    });
  }

  const supabase = await createClient();
  const { data: items, error: itemError } = await supabase
    .from("inventory_items")
    .select("id, name")
    .eq("store_id", profile.store_id);

  if (itemError) throw new Error(itemError.message);

  const itemByName = new Map((items ?? []).map((item) => [normalizeName(String(item.name)), String(item.id)]));
  const missingItems = Array.from(new Set(preview.lines.map((line) => line.item_name).filter((name) => !itemByName.has(normalizeName(name)))))
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  if (missingItems.length > 0) {
    const batch = await recordFailedImportBatch(profile, {
      import_type: "purchases",
      source_file: file.name,
      total_rows: preview.totalRows,
      skipped_rows: preview.skippedCount,
      warning_count: preview.warnings.length + missingItems.length,
      error_message: `采购导入已停止：缺少库存档案 ${missingItems.join("、")}`,
    });
    await recordImportBatchIssues(
      profile,
      batch?.id,
      missingItems.map((name) => ({
        severity: "error",
        issue_type: "inventory_item_missing",
        entity_name: name,
        message: `采购原料「${name}」没有库存档案，请先在库存中心创建或导入原料。`,
      })),
    );

    return NextResponse.json(
      {
        error: "采购导入已停止：以下原料还没有库存档案。",
        missingItems,
        importableCount: preview.importableCount,
        skippedCount: preview.skippedCount,
        warnings: preview.warnings,
      },
      { status: 422 },
    );
  }

  const importedPurchaseIds: string[] = [];

  for (const group of groups) {
    const first = group[0];
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .insert({
        store_id: profile.store_id,
        supplier: first.supplier,
        purchase_date: first.purchase_date,
        payment_method: first.payment_method,
        operator_id: profile.id,
      })
      .select("id")
      .single();

    if (orderError || !order) throw new Error(orderError?.message ?? "创建采购单失败");

    const { error: linesError } = await supabase.from("purchase_order_items").insert(
      group.map((line) => ({
        store_id: profile.store_id,
        purchase_order_id: order.id,
        item_id: itemByName.get(normalizeName(line.item_name)),
        qty: line.qty,
        unit_price: line.unit_price,
      })),
    );

    if (linesError) throw new Error(linesError.message);

    const { error: rpcError } = await supabase.rpc("complete_purchase_order", {
      p_purchase_order_id: order.id,
    });

    if (rpcError) throw new Error(rpcError.message);
    importedPurchaseIds.push(order.id);
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory/items");
  revalidatePath("/inventory/movements");
  revalidatePath("/finance/cashflow");

  const batch = await recordImportBatch(profile, {
    import_type: "purchases",
    source_file: file.name,
    status: "completed",
    total_rows: preview.totalRows,
    imported_rows: preview.importableCount,
    skipped_rows: preview.skippedCount,
    warning_count: preview.warnings.length,
  });
  await recordImportBatchIssues(
    profile,
    batch?.id,
    [
      ...preview.warnings.map((warning) => ({
        severity: "warning" as const,
        issue_type: "preview_warning",
        entity_name: "采购导入",
        message: warning,
      })),
      ...preview.skippedRows.map((row) => ({
        severity: "info" as const,
        issue_type: "purchase_row_skipped",
        entity_name: row.name || `第 ${row.rowNo} 行`,
        row_no: row.rowNo,
        message: `已跳过：${row.reason}`,
        payload: row,
      })),
    ],
  );

  return NextResponse.json({
    mode: "supabase",
    importableCount: preview.importableCount,
    skippedCount: preview.skippedCount,
    purchaseOrderCount: importedPurchaseIds.length,
    simulatedCount: 0,
    totalAmount: Number(preview.lines.reduce((sum, line) => sum + line.amount, 0).toFixed(2)),
    importedPurchaseIds,
    warnings: preview.warnings,
  });
}
