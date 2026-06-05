import { listImportBatches } from "@/lib/data/import-batches";
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
