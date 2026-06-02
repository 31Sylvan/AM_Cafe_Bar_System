import * as XLSX from "xlsx";
import { toCsv } from "@/lib/export/csv";
import type { ProductCategory, RecordStatus } from "@/lib/types";

export type NormalizedCatalogProduct = {
  name: string;
  category: ProductCategory;
  source_category: string;
  sale_price: number;
  cost_price: number;
  status: RecordStatus;
  description: string;
  source_channels: string;
  image_url: string;
  external_sort: number | null;
  external_store_id: string;
};

export type ProductCatalogPreviewResult = {
  sourceFile: string;
  totalRows: number;
  importableCount: number;
  skippedCount: number;
  activeCount: number;
  inactiveCount: number;
  categorySummary: Record<string, number>;
  warnings: string[];
  products: NormalizedCatalogProduct[];
  skippedProducts: Array<{ name: string; source_category: string; reason: string }>;
  csv: string;
};

const categoryMap: Record<string, ProductCategory | null> = {
  经典咖啡: "咖啡",
  SOE单品: "咖啡",
  冷萃系列: "咖啡",
  无咖系列: "茶饮",
  创意特调: "茶饮",
  季节限定: "茶饮",
  特色鸡尾酒: "鸡尾酒",
  Cocktail: "鸡尾酒",
  威士忌纯饮: "鸡尾酒",
  葡萄酒: "鸡尾酒",
  精酿系列: "啤酒",
  佐酒小食: "食品",
  甜品烘焙: "食品",
  轻食炸物: "食品",
  推荐套餐: "食品",
  限时段供应: "食品",
  "「Star」手工发夹系列": null,
  场地租赁: null,
  "": null,
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

function status(value: unknown): RecordStatus {
  return text(value) === "上架" ? "active" : "inactive";
}

function rowsFromWorkbook(bytes: ArrayBuffer) {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

export async function previewProductCatalogWorkbook(file: File): Promise<ProductCatalogPreviewResult> {
  const rows = rowsFromWorkbook(await file.arrayBuffer());
  const products: NormalizedCatalogProduct[] = [];
  const skippedProducts: ProductCatalogPreviewResult["skippedProducts"] = [];
  const warnings: string[] = [];
  const categorySummary: Record<string, number> = {};
  const seenNames = new Set<string>();

  for (const row of rows) {
    const name = text(row["商品名称"]);
    const sourceCategory = text(row["商品分类"]);
    categorySummary[sourceCategory || "未分类"] = (categorySummary[sourceCategory || "未分类"] ?? 0) + 1;

    if (!name) {
      skippedProducts.push({ name: "", source_category: sourceCategory, reason: "商品名称为空" });
      continue;
    }

    const mappedCategory = categoryMap[sourceCategory];
    if (!mappedCategory) {
      skippedProducts.push({ name, source_category: sourceCategory || "未分类", reason: "不属于标准经营商品分类" });
      continue;
    }

    if (seenNames.has(name)) {
      skippedProducts.push({ name, source_category: sourceCategory, reason: "商品名称重复" });
      continue;
    }

    const salePrice = money(row["销售价格（元）"]);
    if (salePrice <= 0) {
      skippedProducts.push({ name, source_category: sourceCategory, reason: "销售价格为空或小于等于 0" });
      continue;
    }

    seenNames.add(name);
    products.push({
      name,
      category: mappedCategory,
      source_category: sourceCategory,
      sale_price: salePrice,
      cost_price: money(row["成本价（元）"]),
      status: status(row["商品状态"]),
      description: text(row["商品简介"]),
      source_channels: text(row["售卖渠道"]),
      image_url: text(row["商品图片"]),
      external_sort: Number.isFinite(Number(row["排序"])) ? Number(row["排序"]) : null,
      external_store_id: text(row["门店ID"]),
    });
  }

  if (products.some((product) => product.cost_price <= 0)) {
    warnings.push("商品导出表内多数成本价为 0；产品售价可先导入，真实毛利仍需要配方和原料成本计算。");
  }

  if (skippedProducts.length > 0) {
    warnings.push(`已跳过 ${skippedProducts.length} 个非标准经营商品、空名称、重复名称或无售价商品。`);
  }

  const csv = toCsv(
    ["name", "category", "sale_price", "status", "source_category", "source_channels", "description", "image_url"],
    products.map((product) => [
      product.name,
      product.category,
      product.sale_price,
      product.status,
      product.source_category,
      product.source_channels,
      product.description,
      product.image_url,
    ]),
  );

  return {
    sourceFile: file.name,
    totalRows: rows.length,
    importableCount: products.length,
    skippedCount: skippedProducts.length,
    activeCount: products.filter((product) => product.status === "active").length,
    inactiveCount: products.filter((product) => product.status !== "active").length,
    categorySummary,
    warnings,
    products,
    skippedProducts,
    csv,
  };
}
