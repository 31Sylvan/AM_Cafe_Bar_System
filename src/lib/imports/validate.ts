import { EXPENSE_CATEGORIES, INVENTORY_CATEGORIES, PAYMENT_METHODS, PRODUCT_CATEGORIES, SALES_CHANNELS } from "@/lib/constants";
import type { InventoryCategory, InventoryUnit, PaymentMethod, ProductCategory, SalesChannel } from "@/lib/types";
import { parseCsv } from "./csv";

export type ImportTemplate = "inventory-items" | "inventory-import" | "products" | "recipes" | "employees" | "purchases" | "sales-batch";

export type ImportValidationResult = {
  template: ImportTemplate;
  rowCount: number;
  validRows: number;
  errors: string[];
  warnings: string[];
  headers: string[];
};

const requiredHeaders: Record<ImportTemplate, string[]> = {
  "inventory-items": ["name", "category", "unit", "safe_stock", "cost_price"],
  "inventory-import": ["name", "category", "unit", "safe_stock", "cost_price", "actual_qty"],
  products: ["name", "category", "sale_price"],
  recipes: ["product_name", "item_name", "qty", "unit"],
  employees: ["name", "position", "hourly_rate", "hire_date"],
  purchases: ["supplier", "purchase_date", "item_name", "qty", "unit_price"],
  "sales-batch": ["sale_date", "channel", "payment_method", "product_name", "qty", "unit_price"],
};

const optionalHeaders: Record<ImportTemplate, string[]> = {
  "inventory-items": ["specification", "status"],
  "inventory-import": ["specification", "status"],
  products: ["status"],
  recipes: [],
  employees: ["phone", "status"],
  purchases: [],
  "sales-batch": ["external_order_no"],
};

const categoryUnits: Record<InventoryCategory, InventoryUnit[]> = {
  咖啡豆: ["g"],
  奶类: ["ml"],
  糖浆: ["ml"],
  酒类: ["ml"],
  耗材: ["pcs"],
  食品: ["g", "pcs"],
};

function isPositiveNumber(value: string) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function isNonNegativeNumber(value: string) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateHeaders(template: ImportTemplate, headers: string[]) {
  const allowed = new Set([...requiredHeaders[template], ...optionalHeaders[template]]);
  const missing = requiredHeaders[template].filter((header) => !headers.includes(header));
  const unknown = headers.filter((header) => !allowed.has(header));

  return {
    missing,
    unknown,
  };
}

export function validateImportCsv(template: ImportTemplate, csv: string): ImportValidationResult {
  const parsed = parseCsv(csv);
  const errors: string[] = [];
  const warnings: string[] = [];
  const { missing, unknown } = validateHeaders(template, parsed.headers);

  for (const header of missing) errors.push(`缺少必填列：${header}`);
  for (const header of unknown) warnings.push(`未识别列将被忽略：${header}`);

  const seenNames = new Set<string>();
  let validRows = 0;

  parsed.rows.forEach((row, index) => {
    const rowNo = index + 2;
    const rowErrors: string[] = [];

    if (template === "inventory-items" || template === "inventory-import") {
      if (!row.name) rowErrors.push("name 不能为空");
      if (row.name && seenNames.has(row.name)) rowErrors.push(`原料名称重复：${row.name}`);
      if (row.name) seenNames.add(row.name);
      if (!INVENTORY_CATEGORIES.includes(row.category as InventoryCategory)) rowErrors.push("category 不在允许范围");
      const units = categoryUnits[row.category as InventoryCategory];
      if (!units?.includes(row.unit as InventoryUnit)) rowErrors.push("unit 与 category 不匹配");
      if (!isNonNegativeNumber(row.safe_stock)) rowErrors.push("safe_stock 必须为非负数");
      if (!isNonNegativeNumber(row.cost_price)) rowErrors.push("cost_price 必须为非负数");
      if (template === "inventory-import" && !isNonNegativeNumber(row.actual_qty)) rowErrors.push("actual_qty 必须为非负数");
    }

    if (template === "products") {
      if (!row.name) rowErrors.push("name 不能为空");
      if (row.name && seenNames.has(row.name)) rowErrors.push(`产品名称重复：${row.name}`);
      if (row.name) seenNames.add(row.name);
      if (!PRODUCT_CATEGORIES.includes(row.category as ProductCategory)) rowErrors.push("category 不在允许范围");
      if (!isPositiveNumber(row.sale_price)) rowErrors.push("sale_price 必须为正数");
    }

    if (template === "recipes") {
      if (!row.product_name) rowErrors.push("product_name 不能为空");
      if (!row.item_name) rowErrors.push("item_name 不能为空");
      if (!isPositiveNumber(row.qty)) rowErrors.push("qty 必须为正数");
      if (!["g", "ml", "pcs"].includes(row.unit)) rowErrors.push("unit 不在允许范围");
    }

    if (template === "employees") {
      if (!row.name) rowErrors.push("name 不能为空");
      if (!row.position) rowErrors.push("position 不能为空");
      if (!isNonNegativeNumber(row.hourly_rate)) rowErrors.push("hourly_rate 必须为非负数");
      if (!isDate(row.hire_date)) rowErrors.push("hire_date 必须为 YYYY-MM-DD");
    }

    if (template === "purchases") {
      if (!row.supplier) rowErrors.push("supplier 不能为空");
      if (!isDate(row.purchase_date)) rowErrors.push("purchase_date 必须为 YYYY-MM-DD");
      if (!row.item_name) rowErrors.push("item_name 不能为空");
      if (!isPositiveNumber(row.qty)) rowErrors.push("qty 必须为正数");
      if (!isNonNegativeNumber(row.unit_price)) rowErrors.push("unit_price 必须为非负数");
    }

    if (template === "sales-batch") {
      if (!isDate(row.sale_date)) rowErrors.push("sale_date 必须为 YYYY-MM-DD");
      if (!SALES_CHANNELS.includes(row.channel as SalesChannel)) rowErrors.push("channel 不在允许范围");
      if (!PAYMENT_METHODS.includes(row.payment_method as PaymentMethod)) rowErrors.push("payment_method 不在允许范围");
      if (!row.product_name) rowErrors.push("product_name 不能为空");
      if (!isPositiveNumber(row.qty)) rowErrors.push("qty 必须为正数");
      if (!isNonNegativeNumber(row.unit_price)) rowErrors.push("unit_price 必须为非负数");
    }

    if (rowErrors.length > 0) {
      errors.push(`第 ${rowNo} 行：${rowErrors.join("；")}`);
    } else {
      validRows += 1;
    }
  });

  if (parsed.rows.length === 0 && missing.length === 0) {
    warnings.push("文件只有表头，没有数据行");
  }

  if (template === "purchases") {
    warnings.push(`采购导入只做格式预检；正式写入前还需要匹配系统内已有原料名称。可用支出分类：${EXPENSE_CATEGORIES.join("、")}；付款方式：${PAYMENT_METHODS.join("、")}。`);
  }

  if (template === "sales-batch") {
    warnings.push(`销售批量录入只做格式预检；正式写入前还需要匹配系统内已有产品名称。可用渠道：${SALES_CHANNELS.join("、")}；付款方式：${PAYMENT_METHODS.join("、")}。`);
  }

  return {
    template,
    rowCount: parsed.rows.length,
    validRows,
    errors,
    warnings,
    headers: parsed.headers,
  };
}
