import * as XLSX from "xlsx";
import { toCsv } from "@/lib/export/csv";
import { CATEGORY_UNITS, INVENTORY_CATEGORIES, PAYMENT_METHODS, STOCK_COUNT_TYPES } from "@/lib/constants";
import type { InventoryCategory, InventoryUnit, PaymentMethod, RecordStatus, StockCountType } from "@/lib/types";

type Row = Record<string, unknown>;

export type NormalizedInventoryImportLine = {
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  specification: string;
  safe_stock: number;
  cost_price: number;
  actual_qty: number | null;
  status: RecordStatus;
};

export type NormalizedPurchaseImportLine = {
  supplier: string;
  purchase_date: string;
  payment_method: PaymentMethod;
  item_name: string;
  qty: number;
  unit_price: number;
  amount: number;
};

export type NormalizedRecipeImportLine = {
  product_name: string;
  item_name: string;
  qty: number;
  unit: InventoryUnit;
};

export type BusinessImportPreview<TLine> = {
  sourceFile: string;
  totalRows: number;
  importableCount: number;
  skippedCount: number;
  warnings: string[];
  errors: string[];
  lines: TLine[];
  skippedRows: Array<{ rowNo: number; name: string; reason: string }>;
  csv: string;
};

const inventoryHeaders = {
  name: ["name", "原料名称", "物料名称", "库存名称", "商品名称", "名称"],
  category: ["category", "分类", "原料分类", "库存分类"],
  unit: ["unit", "单位"],
  specification: ["specification", "规格", "规格说明"],
  safe_stock: ["safe_stock", "安全库存", "预警库存", "库存预警"],
  cost_price: ["cost_price", "成本价", "单位成本", "采购单价", "单价"],
  actual_qty: ["actual_qty", "current_qty", "库存数量", "实际库存", "当前库存", "数量"],
  status: ["status", "状态"],
};

const purchaseHeaders = {
  supplier: ["supplier", "供应商", "供货商"],
  purchase_date: ["purchase_date", "date", "采购日期", "日期", "下单时间"],
  payment_method: ["payment_method", "付款方式", "支付方式"],
  item_name: ["item_name", "原料名称", "物料名称", "库存名称", "商品名称", "名称"],
  qty: ["qty", "采购数量", "数量", "入库数量"],
  unit_price: ["unit_price", "采购单价", "单价", "成本价", "单位成本"],
};

const recipeHeaders = {
  product_name: ["product_name", "产品名称", "商品名称", "饮品名称", "成品名称"],
  item_name: ["item_name", "原料名称", "物料名称", "库存名称"],
  qty: ["qty", "用量", "数量", "配方用量"],
  unit: ["unit", "单位"],
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = text(value).replace(/[,\s￥¥元]/g, "");
  if (!normalized) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function dateValue(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const raw = text(value);
  if (!raw) return "";
  const normalized = raw.replaceAll("/", "-").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : raw;
}

function statusValue(value: unknown): RecordStatus {
  const raw = text(value);
  if (!raw || raw === "启用" || raw === "正常" || raw === "上架" || raw === "active") return "active";
  return "inactive";
}

function paymentMethod(value: unknown): PaymentMethod {
  const raw = text(value);
  const matched = PAYMENT_METHODS.find((method) => raw.includes(method));
  return matched ?? "微信";
}

function categoryValue(value: unknown): InventoryCategory | null {
  const raw = text(value);
  return INVENTORY_CATEGORIES.includes(raw as InventoryCategory) ? (raw as InventoryCategory) : null;
}

function unitValue(value: unknown): InventoryUnit | null {
  const raw = text(value).toLowerCase();
  if (raw === "g" || raw === "克") return "g";
  if (raw === "ml" || raw === "毫升") return "ml";
  if (raw === "pcs" || raw === "个" || raw === "件" || raw === "只") return "pcs";
  return null;
}

function read(row: Row, candidates: string[]) {
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return "";
}

function rowsFromWorkbook(bytes: ArrayBuffer) {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
}

function buildResult<TLine>(
  file: File,
  rows: Row[],
  lines: TLine[],
  skippedRows: BusinessImportPreview<TLine>["skippedRows"],
  warnings: string[],
  errors: string[],
  csvHeaders: string[],
  csvRows: unknown[][],
): BusinessImportPreview<TLine> {
  return {
    sourceFile: file.name,
    totalRows: rows.length,
    importableCount: lines.length,
    skippedCount: skippedRows.length,
    warnings: Array.from(new Set(warnings)),
    errors,
    lines,
    skippedRows,
    csv: toCsv(csvHeaders, csvRows),
  };
}

export async function previewInventoryWorkbook(file: File): Promise<BusinessImportPreview<NormalizedInventoryImportLine>> {
  const rows = rowsFromWorkbook(await file.arrayBuffer());
  const lines: NormalizedInventoryImportLine[] = [];
  const skippedRows: BusinessImportPreview<NormalizedInventoryImportLine>["skippedRows"] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const name = text(read(row, inventoryHeaders.name));
    const category = categoryValue(read(row, inventoryHeaders.category));
    const unit = unitValue(read(row, inventoryHeaders.unit));
    const safeStock = numberValue(read(row, inventoryHeaders.safe_stock)) ?? 0;
    const costPrice = numberValue(read(row, inventoryHeaders.cost_price)) ?? 0;
    const actualQty = numberValue(read(row, inventoryHeaders.actual_qty));
    const reasons: string[] = [];

    if (!name) reasons.push("原料名称为空");
    if (name && seen.has(name)) reasons.push("原料名称重复");
    if (!category) reasons.push("分类不在允许范围");
    if (!unit) reasons.push("单位不在允许范围");
    if (category && unit && !CATEGORY_UNITS[category].includes(unit)) reasons.push("分类和单位不匹配");
    if (safeStock < 0) reasons.push("安全库存不能小于 0");
    if (costPrice < 0) reasons.push("成本价不能小于 0");
    if (actualQty !== null && actualQty < 0) reasons.push("实际库存不能小于 0");

    if (reasons.length > 0) {
      skippedRows.push({ rowNo, name, reason: reasons.join("；") });
      return;
    }

    seen.add(name);
    lines.push({
      name,
      category: category as InventoryCategory,
      unit: unit as InventoryUnit,
      specification: text(read(row, inventoryHeaders.specification)),
      safe_stock: Number(safeStock.toFixed(3)),
      cost_price: Number(costPrice.toFixed(4)),
      actual_qty: actualQty === null ? null : Number(actualQty.toFixed(3)),
      status: statusValue(read(row, inventoryHeaders.status)),
    });
  });

  if (lines.some((line) => line.actual_qty !== null)) {
    warnings.push("正式导入会创建一张月盘点单，用实际库存校准当前库存余额。");
  }

  return buildResult(
    file,
    rows,
    lines,
    skippedRows,
    warnings,
    errors,
    ["name", "category", "unit", "specification", "safe_stock", "cost_price", "actual_qty", "status"],
    lines.map((line) => [line.name, line.category, line.unit, line.specification, line.safe_stock, line.cost_price, line.actual_qty ?? "", line.status]),
  );
}

export async function previewPurchaseWorkbook(file: File): Promise<BusinessImportPreview<NormalizedPurchaseImportLine>> {
  const rows = rowsFromWorkbook(await file.arrayBuffer());
  const lines: NormalizedPurchaseImportLine[] = [];
  const skippedRows: BusinessImportPreview<NormalizedPurchaseImportLine>["skippedRows"] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const supplier = text(read(row, purchaseHeaders.supplier));
    const purchaseDate = dateValue(read(row, purchaseHeaders.purchase_date));
    const itemName = text(read(row, purchaseHeaders.item_name));
    const qty = numberValue(read(row, purchaseHeaders.qty));
    const unitPrice = numberValue(read(row, purchaseHeaders.unit_price));
    const reasons: string[] = [];

    if (!supplier) reasons.push("供应商为空");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) reasons.push("采购日期不是 YYYY-MM-DD");
    if (!itemName) reasons.push("原料名称为空");
    if (qty === null || qty <= 0) reasons.push("采购数量必须大于 0");
    if (unitPrice === null || unitPrice < 0) reasons.push("采购单价不能小于 0");

    if (reasons.length > 0) {
      skippedRows.push({ rowNo, name: itemName, reason: reasons.join("；") });
      return;
    }

    const normalizedQty = Number((qty as number).toFixed(3));
    const normalizedUnitPrice = Number((unitPrice as number).toFixed(4));
    lines.push({
      supplier,
      purchase_date: purchaseDate,
      payment_method: paymentMethod(read(row, purchaseHeaders.payment_method)),
      item_name: itemName,
      qty: normalizedQty,
      unit_price: normalizedUnitPrice,
      amount: Number((normalizedQty * normalizedUnitPrice).toFixed(2)),
    });
  });

  warnings.push("正式导入会按供应商、日期和付款方式分组生成采购单，并自动生成 PURCHASE 库存流水与采购现金支出。");

  return buildResult(
    file,
    rows,
    lines,
    skippedRows,
    warnings,
    errors,
    ["supplier", "purchase_date", "payment_method", "item_name", "qty", "unit_price", "amount"],
    lines.map((line) => [line.supplier, line.purchase_date, line.payment_method, line.item_name, line.qty, line.unit_price, line.amount]),
  );
}

export async function previewRecipeWorkbook(file: File): Promise<BusinessImportPreview<NormalizedRecipeImportLine>> {
  const rows = rowsFromWorkbook(await file.arrayBuffer());
  const lines: NormalizedRecipeImportLine[] = [];
  const skippedRows: BusinessImportPreview<NormalizedRecipeImportLine>["skippedRows"] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const productName = text(read(row, recipeHeaders.product_name));
    const itemName = text(read(row, recipeHeaders.item_name));
    const qty = numberValue(read(row, recipeHeaders.qty));
    const unit = unitValue(read(row, recipeHeaders.unit));
    const reasons: string[] = [];

    if (!productName) reasons.push("产品名称为空");
    if (!itemName) reasons.push("原料名称为空");
    if (qty === null || qty <= 0) reasons.push("配方用量必须大于 0");
    if (!unit) reasons.push("单位不在允许范围");

    if (reasons.length > 0) {
      skippedRows.push({ rowNo, name: productName || itemName, reason: reasons.join("；") });
      return;
    }

    lines.push({
      product_name: productName,
      item_name: itemName,
      qty: Number((qty as number).toFixed(3)),
      unit: unit as InventoryUnit,
    });
  });

  warnings.push("正式导入会覆盖文件中这些产品的旧配方，未出现在文件里的产品不会被修改。");

  return buildResult(
    file,
    rows,
    lines,
    skippedRows,
    warnings,
    errors,
    ["product_name", "item_name", "qty", "unit"],
    lines.map((line) => [line.product_name, line.item_name, line.qty, line.unit]),
  );
}

export function stockCountTypeLabel(value: StockCountType) {
  return STOCK_COUNT_TYPES.find((type) => type.value === value)?.label ?? value;
}
