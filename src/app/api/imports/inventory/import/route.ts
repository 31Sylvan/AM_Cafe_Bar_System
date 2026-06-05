import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePermission, requireProfile } from "@/lib/auth";
import { recordImportBatch, recordImportBatchIssues } from "@/lib/data/import-batches";
import { previewInventoryWorkbook } from "@/lib/imports/business-xls";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "请上传库存导入表" }, { status: 400 });
  }

  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "库存导入表不能超过 3MB" }, { status: 400 });
  }

  const preview = await previewInventoryWorkbook(file);

  if (!hasSupabaseEnv()) {
    return NextResponse.json({
      mode: "demo",
      importableCount: preview.importableCount,
      skippedCount: preview.skippedCount,
      upsertedCount: 0,
      adjustedCount: 0,
      simulatedCount: preview.importableCount,
      warnings: ["当前为本地 Demo 模式：已完成库存导入校验，但不会写入真实数据库。", ...preview.warnings],
    });
  }

  const supabase = await createClient();
  const { error: upsertError } = await supabase.from("inventory_items").upsert(
    preview.lines.map((line) => ({
      store_id: profile.store_id,
      name: line.name,
      category: line.category,
      unit: line.unit,
      specification: line.specification || null,
      safe_stock: line.safe_stock,
      cost_price: line.cost_price,
      status: line.status,
    })),
    { onConflict: "store_id,name" },
  );

  if (upsertError) throw new Error(upsertError.message);

  const qtyLines = preview.lines.filter((line) => line.actual_qty !== null);
  let adjustedCount = 0;

  if (qtyLines.length > 0) {
    const { data: items, error: itemError } = await supabase
      .from("inventory_items")
      .select("id, name")
      .eq("store_id", profile.store_id)
      .in(
        "name",
        qtyLines.map((line) => line.name),
      );

    if (itemError) throw new Error(itemError.message);

    const itemByName = new Map((items ?? []).map((item) => [String(item.name), String(item.id)]));
    const itemIds = qtyLines.map((line) => itemByName.get(line.name)).filter((id): id is string => Boolean(id));

    const { data: balances, error: balanceError } = await supabase
      .from("v_inventory_balances")
      .select("item_id, current_qty")
      .in("item_id", itemIds);

    if (balanceError) throw new Error(balanceError.message);

    const theoreticalByItem = new Map((balances ?? []).map((item) => [String(item.item_id), Number(item.current_qty)]));

    const { data: count, error: countError } = await supabase
      .from("stock_counts")
      .insert({
        store_id: profile.store_id,
        count_type: "monthly",
        count_date: new Date().toISOString().slice(0, 10),
        operator_id: profile.id,
      })
      .select("id")
      .single();

    if (countError || !count) throw new Error(countError?.message ?? "创建库存导入盘点单失败");

    const countRows = qtyLines
      .map((line) => {
        const itemId = itemByName.get(line.name);
        if (!itemId) return null;
        return {
          store_id: profile.store_id,
          stock_count_id: count.id,
          item_id: itemId,
          theoretical_qty: theoreticalByItem.get(itemId) ?? 0,
          actual_qty: line.actual_qty ?? 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const { error: countItemError } = await supabase.from("stock_count_items").insert(countRows);
    if (countItemError) throw new Error(countItemError.message);

    const { error: rpcError } = await supabase.rpc("complete_stock_count", {
      p_stock_count_id: count.id,
    });

    if (rpcError) throw new Error(rpcError.message);
    adjustedCount = countRows.length;
  }

  revalidatePath("/inventory/items");
  revalidatePath("/inventory/movements");
  revalidatePath("/stock-counts");

  const batch = await recordImportBatch(profile, {
    import_type: "inventory",
    source_file: file.name,
    status: "completed",
    total_rows: preview.totalRows,
    imported_rows: preview.importableCount,
    skipped_rows: preview.skippedCount,
    warning_count: preview.warnings.length,
  });
  await recordImportBatchIssues(profile, batch?.id, [
    ...preview.warnings.map((warning) => ({
      severity: "warning" as const,
      issue_type: "preview_warning",
      entity_name: "库存导入",
      message: warning,
    })),
    ...preview.skippedRows.map((row) => ({
      severity: "info" as const,
      issue_type: "inventory_row_skipped",
      entity_name: row.name || `第 ${row.rowNo} 行`,
      row_no: row.rowNo,
      message: `已跳过：${row.reason}`,
      payload: row,
    })),
  ]);

  return NextResponse.json({
    mode: "supabase",
    importableCount: preview.importableCount,
    skippedCount: preview.skippedCount,
    upsertedCount: preview.importableCount,
    adjustedCount,
    simulatedCount: 0,
    warnings: preview.warnings,
  });
}
