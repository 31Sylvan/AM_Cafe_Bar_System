import { listImportBatches } from "@/lib/data/import-batches";
import { listNegativeInventoryBalances, listProductsWithoutRecipe } from "@/lib/data/quality";
import { listProfitLossByFilter, getCashflowStatement } from "@/lib/data/finance";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { ImportBatch, Product } from "@/lib/types";

type ReadinessStatus = "ready" | "warning" | "blocked";

export type ImportReadinessCheck = {
  key: string;
  title: string;
  description: string;
  status: ReadinessStatus;
  count: number;
  actionHref: string;
  actionLabel: string;
};

export type ImportReadiness = {
  checks: ImportReadinessCheck[];
  counts: {
    inventoryItems: number;
    products: number;
    recipeLines: number;
    productAliases: number;
    purchaseOrders: number;
    salesOrders: number;
  };
  missingRecipeProducts: Pick<Product, "id" | "name" | "category">[];
  recentFailedBatches: ImportBatch[];
  recentWarningBatches: ImportBatch[];
};

export type TrialRunValidation = {
  month: string;
  monthLabel: string;
  summary: {
    salesOrderCount: number;
    salesRevenue: number;
    cashSalesIncome: number;
    cashDifference: number;
    salesLineCount: number;
    theoreticalCost: number;
    profitLossRevenue: number;
    profitLossMaterialCost: number;
    saleMovementCount: number;
    saleMovementQty: number;
    importedOrderCount: number;
    duplicateSkippedCount: number;
    failedBatchCount: number;
    warningBatchCount: number;
    missingRecipeCount: number;
    negativeInventoryCount: number;
  };
  checks: Array<{
    key: string;
    title: string;
    expected: number;
    actual: number;
    difference: number;
    status: "ok" | "warning" | "blocked";
    actionHref: string;
    actionLabel: string;
    message: string;
  }>;
  recentBatches: ImportBatch[];
  missingRecipeProducts: Pick<Product, "id" | "name" | "category">[];
};

export async function getImportReadiness(): Promise<ImportReadiness> {
  if (!hasSupabaseEnv()) {
    return {
      counts: {
        inventoryItems: 0,
        products: 0,
        recipeLines: 0,
        productAliases: 0,
        purchaseOrders: 0,
        salesOrders: 0,
      },
      missingRecipeProducts: [],
      recentFailedBatches: [],
      recentWarningBatches: [],
      checks: [
        {
          key: "demo",
          title: "连接 Supabase 后开始验收",
          description: "当前是本地 Demo 模式，真实试运行需要连接云数据库并登录老板账号。",
          status: "blocked",
          count: 0,
          actionHref: "/settings",
          actionLabel: "查看系统设置",
        },
      ],
    };
  }

  const supabase = await createClient();
  const [
    inventoryItems,
    products,
    recipeLines,
    productAliases,
    purchaseOrders,
    salesOrders,
    activeProducts,
    productRecipeRows,
    batches,
  ] = await Promise.all([
    countRows("inventory_items", { status: "active" }),
    countRows("products", { status: "active" }),
    countRows("recipes"),
    countRows("product_aliases"),
    countRows("purchase_orders"),
    countRows("sales_orders"),
    supabase
      .from("products")
      .select("id, name, category")
      .eq("status", "active")
      .order("category")
      .order("name"),
    supabase.from("recipes").select("product_id"),
    listImportBatches(),
  ]);

  if (activeProducts.error) throw new Error(activeProducts.error.message);
  if (productRecipeRows.error) throw new Error(productRecipeRows.error.message);

  const recipeProductIds = new Set((productRecipeRows.data ?? []).map((row) => row.product_id));
  const missingRecipeProducts = ((activeProducts.data ?? []) as Pick<Product, "id" | "name" | "category">[])
    .filter((product) => !recipeProductIds.has(product.id))
    .slice(0, 20);

  const counts = {
    inventoryItems,
    products,
    recipeLines,
    productAliases,
    purchaseOrders,
    salesOrders,
  };

  return {
    counts,
    missingRecipeProducts,
    recentFailedBatches: batches.filter((batch) => batch.status === "failed").slice(0, 5),
    recentWarningBatches: batches.filter((batch) => batch.status === "completed" && batch.warning_count > 0).slice(0, 5),
    checks: [
      {
        key: "inventory",
        title: "原料库存档案",
        description: inventoryItems > 0 ? "已建立原料、成本和安全库存基础资料。" : "先导入或录入原料，否则采购、配方和库存无法联动。",
        status: inventoryItems > 0 ? "ready" : "blocked",
        count: inventoryItems,
        actionHref: "/imports/inventory",
        actionLabel: "导入库存",
      },
      {
        key: "products",
        title: "商品档案",
        description: products > 0 ? "已建立可售商品，订单导入可以开始做商品匹配。" : "先导入商品表，订单里的商品名才有匹配目标。",
        status: products > 0 ? "ready" : "blocked",
        count: products,
        actionHref: "/imports/products",
        actionLabel: "导入商品",
      },
      {
        key: "recipes",
        title: "配方完整度",
        description:
          products === 0
            ? "商品导入后再维护配方。"
            : missingRecipeProducts.length === 0
              ? "所有 active 商品都有配方，订单导入后可自动扣库存和计算理论成本。"
              : "仍有 active 商品缺少配方，相关订单会被导入拦截。",
        status: products === 0 || missingRecipeProducts.length > 0 ? "blocked" : "ready",
        count: recipeLines,
        actionHref: "/imports/recipes",
        actionLabel: "导入配方",
      },
      {
        key: "purchases",
        title: "采购与现金支出",
        description: purchaseOrders > 0 ? "已有采购入库记录，可用于真实库存和现金支出联动。" : "建议导入至少一个月采购表，才能测试实际成本和现金支出。",
        status: purchaseOrders > 0 ? "ready" : "warning",
        count: purchaseOrders,
        actionHref: "/imports/purchases",
        actionLabel: "导入采购",
      },
      {
        key: "aliases",
        title: "商品别名映射",
        description: productAliases > 0 ? "已有别名映射，可处理小程序商品名和系统商品名不一致。" : "真实订单商品名不一致时，需要先建立别名再导入。",
        status: productAliases > 0 ? "ready" : "warning",
        count: productAliases,
        actionHref: "/products/aliases",
        actionLabel: "维护别名",
      },
      {
        key: "orders",
        title: "真实订单导入",
        description: salesOrders > 0 ? "已有真实/手工销售数据，可继续验收库存扣减和财务收入。" : "基础资料就绪后，导入每月订单表生成销售和现金收入。",
        status: inventoryItems > 0 && products > 0 && missingRecipeProducts.length === 0 ? "ready" : "blocked",
        count: salesOrders,
        actionHref: "/imports/orders",
        actionLabel: "导入订单",
      },
    ],
  };
}

export async function getTrialRunValidation(month: string): Promise<TrialRunValidation> {
  const safeMonth = /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const range = resolveMonthRange(safeMonth);
  const monthLabel = formatMonthLabel(safeMonth);

  if (!hasSupabaseEnv()) {
    return {
      month: safeMonth,
      monthLabel,
      summary: {
        salesOrderCount: 0,
        salesRevenue: 0,
        cashSalesIncome: 0,
        cashDifference: 0,
        salesLineCount: 0,
        theoreticalCost: 0,
        profitLossRevenue: 0,
        profitLossMaterialCost: 0,
        saleMovementCount: 0,
        saleMovementQty: 0,
        importedOrderCount: 0,
        duplicateSkippedCount: 0,
        failedBatchCount: 0,
        warningBatchCount: 0,
        missingRecipeCount: 0,
        negativeInventoryCount: 0,
      },
      checks: [
        validationCheck("demo", "连接 Supabase 后开始真实验收", 1, 0, "blocked", "/settings", "查看系统设置", "当前是本地演示模式，无法读取真实导入结果。"),
      ],
      recentBatches: [],
      missingRecipeProducts: [],
    };
  }

  const supabase = await createClient();
  const [ordersResult, itemsResult, cashflow, profitRows, movementsResult, batches, missingRecipeProducts, negativeInventory] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("id, total_amount, imported_at")
      .eq("status", "completed")
      .gte("sale_date", range.from)
      .lte("sale_date", range.to),
    supabase
      .from("sales_order_items")
      .select("amount, theoretical_cost, sales_orders!inner(status, sale_date)")
      .eq("sales_orders.status", "completed")
      .gte("sales_orders.sale_date", range.from)
      .lte("sales_orders.sale_date", range.to),
    getCashflowStatement({ month: safeMonth }),
    listProfitLossByFilter({ month: safeMonth }),
    supabase
      .from("inventory_movements")
      .select("qty")
      .eq("movement_type", "SALE")
      .eq("reference_type", "sales_order")
      .gte("created_at", `${range.from}T00:00:00`)
      .lte("created_at", `${range.to}T23:59:59`),
    listImportBatches(),
    listProductsWithoutRecipe(),
    listNegativeInventoryBalances(),
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (movementsResult.error) throw new Error(movementsResult.error.message);

  const orders = ordersResult.data ?? [];
  const items = itemsResult.data ?? [];
  const movements = movementsResult.data ?? [];
  const monthBatches = batches.filter((batch) => batch.created_at.slice(0, 7) === safeMonth);
  const profitLoss = profitRows[0];
  const salesRevenue = roundMoney(orders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0));
  const theoreticalCost = roundMoney(items.reduce((sum, item) => sum + Number(item.theoretical_cost ?? 0), 0));
  const cashSalesIncome = roundMoney(cashflow.income_by_category["销售"] ?? 0);
  const profitLossRevenue = roundMoney(Number(profitLoss?.revenue ?? 0));
  const profitLossMaterialCost = roundMoney(Number(profitLoss?.material_cost ?? 0));
  const saleMovementQty = roundMoney(movements.reduce((sum, movement) => sum + Math.abs(Number(movement.qty ?? 0)), 0));
  const duplicateSkippedCount = monthBatches
    .filter((batch) => batch.import_type === "orders")
    .reduce((sum, batch) => sum + Number(batch.skipped_rows ?? 0), 0);
  const importedOrderCount = orders.filter((order) => order.imported_at).length;
  const failedBatchCount = monthBatches.filter((batch) => batch.status === "failed").length;
  const warningBatchCount = monthBatches.filter((batch) => batch.status === "completed" && batch.warning_count > 0).length;

  const summary = {
    salesOrderCount: orders.length,
    salesRevenue,
    cashSalesIncome,
    cashDifference: roundMoney(cashSalesIncome - salesRevenue),
    salesLineCount: items.length,
    theoreticalCost,
    profitLossRevenue,
    profitLossMaterialCost,
    saleMovementCount: movements.length,
    saleMovementQty,
    importedOrderCount,
    duplicateSkippedCount,
    failedBatchCount,
    warningBatchCount,
    missingRecipeCount: missingRecipeProducts.length,
    negativeInventoryCount: negativeInventory.length,
  };

  return {
    month: safeMonth,
    monthLabel,
    summary,
    checks: [
      validationCheck("sales_cash", "销售收入已进入现金流", salesRevenue, cashSalesIncome, undefined, "/finance/cashflow", "查看现金流", "订单总额应等于销售现金收入。"),
      validationCheck("sales_profit", "销售收入已进入利润表", salesRevenue, profitLossRevenue, undefined, "/finance/profit-loss", "查看利润表", "利润表收入应与当月完成销售一致。"),
      validationCheck("cost_profit", "销售成本已进入利润表", theoreticalCost, profitLossMaterialCost, "warning", "/finance/costs", "查看成本", "理论成本和实际成本允许存在差异，但差异过大需要复核库存和损耗。"),
      validationCheck("stock_movements", "销售已生成库存扣减", Math.max(items.length, 1), movements.length, undefined, "/inventory/movements?movement_type=SALE", "查看库存流水", "每个有配方的销售明细应生成 SALE 库存流水。"),
      validationCheck("missing_recipes", "没有缺配方产品", 0, missingRecipeProducts.length, undefined, "/quality", "处理缺配方", "缺配方会阻塞真实订单导入或导致成本失真。"),
      validationCheck("negative_stock", "没有负库存", 0, negativeInventory.length, "warning", "/quality", "处理负库存", "负库存说明采购、盘点或配方消耗需要复核。"),
      validationCheck("failed_batches", "没有失败导入批次", 0, failedBatchCount, undefined, "/imports/history", "查看导入历史", "失败批次需要先处理后再继续试运行。"),
    ],
    recentBatches: monthBatches.slice(0, 8),
    missingRecipeProducts: missingRecipeProducts.slice(0, 12),
  };
}

async function countRows(table: string, equals?: Record<string, string>) {
  const supabase = await createClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  for (const [key, value] of Object.entries(equals ?? {})) {
    query = query.eq(key, value);
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function resolveMonthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00`);
  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);
  end.setDate(0);

  return {
    from: `${month}-01`,
    to: end.toISOString().slice(0, 10),
  };
}

function formatMonthLabel(month: string) {
  const [year, monthNo] = month.split("-");
  return `${year}年${Number(monthNo)}月`;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function validationCheck(
  key: string,
  title: string,
  expected: number,
  actual: number,
  warningWhenDifferent: "warning" | "blocked" | undefined,
  actionHref: string,
  actionLabel: string,
  message: string,
) {
  const difference = roundMoney(actual - expected);
  const isOk = Math.abs(difference) <= 0.05;
  return {
    key,
    title,
    expected: roundMoney(expected),
    actual: roundMoney(actual),
    difference,
    status: isOk ? "ok" as const : (warningWhenDifferent ?? "blocked"),
    actionHref,
    actionLabel,
    message,
  };
}
