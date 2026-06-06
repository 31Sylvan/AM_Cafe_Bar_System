import * as XLSX from "xlsx";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Module from "node:module";
import { createRequire } from "node:module";
import ts from "typescript";

const repoRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "coffee-shop-logic-"));
const require = createRequire(import.meta.url);

const modules = [
  "src/lib/constants.ts",
  "src/lib/export/csv.ts",
  "src/lib/imports/csv.ts",
  "src/lib/imports/validate.ts",
  "src/lib/imports/order-xls.ts",
  "src/lib/import-templates.ts",
  "src/lib/export/business-analysis-xlsx.ts",
];

for (const file of modules) {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const outFile = path.join(tempRoot, file.replace(/^src\//, "").replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, output);
}

const originalResolve = Module._resolveFilename;
const repoModuleParent = {
  filename: path.join(repoRoot, "package.json"),
  paths: Module._nodeModulePaths(repoRoot),
};
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return path.join(tempRoot, `${request.slice(2)}.js`);
  }
  if (!request.startsWith(".") && !path.isAbsolute(request)) {
    return originalResolve.call(this, request, repoModuleParent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

try {
  await run();
} finally {
  Module._resolveFilename = originalResolve;
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

async function run() {
  const { parseCsv } = requireTemp("lib/imports/csv");
  const { toCsv } = requireTemp("lib/export/csv");
  const { validateImportCsv } = requireTemp("lib/imports/validate");
  const { previewOrderWorkbooks } = requireTemp("lib/imports/order-xls");
  const { importTemplateDefinitions } = requireTemp("lib/import-templates");
  const { buildBusinessAnalysisXlsx } = requireTemp("lib/export/business-analysis-xlsx");

  assertDeepEqual(parseCsv('\uFEFFname,note\n"拿铁,热","奶泡""厚"""').rows[0], {
    name: "拿铁,热",
    note: '奶泡"厚"',
  }, "CSV parser handles BOM, comma and escaped quotes");

  assertEqual(toCsv(["name", "note"], [["拿铁,热", '奶泡"厚"']]), 'name,note\n"拿铁,热","奶泡""厚"""', "CSV writer escapes cells");

  const validInventory = validateImportCsv(
    "inventory-import",
    "name,category,unit,safe_stock,cost_price,actual_qty\n中深烘咖啡豆,咖啡豆,g,800,0.18,2500\n全脂牛奶,奶类,ml,3000,0.012,12000",
  );
  assertEqual(validInventory.validRows, 2, "inventory import validation accepts valid rows");
  assertEqual(validInventory.errors.length, 0, "inventory import validation has no errors for valid rows");

  const invalidInventory = validateImportCsv(
    "inventory-import",
    "name,category,unit,safe_stock,cost_price,actual_qty\n中深烘咖啡豆,咖啡豆,ml,800,0.18,2500\n中深烘咖啡豆,咖啡豆,g,800,0.18,-1",
  );
  assertEqual(invalidInventory.validRows, 0, "inventory import validation rejects invalid rows");
  assert(invalidInventory.errors.some((error) => error.includes("unit 与 category 不匹配")), "inventory validation catches category/unit mismatch");
  assert(invalidInventory.errors.some((error) => error.includes("原料名称重复")), "inventory validation catches duplicate names");

  const purchaseTemplate = importTemplateDefinitions.find((template) => template.key === "purchases");
  assert(purchaseTemplate, "purchase template exists");
  assertDeepEqual(
    purchaseTemplate.fields.map((field) => field.key),
    ["supplier", "purchase_date", "payment_method", "item_name", "qty", "unit_price"],
    "purchase template includes payment method in expected order",
  );

  const orderPreview = await previewOrderWorkbooks([orderWorkbookFile()]);
  assertEqual(orderPreview.orderCount, 1, "order workbook preview counts completed paid orders");
  assertEqual(orderPreview.lineCount, 2, "order workbook preview parses two product lines");
  assertEqual(orderPreview.skippedCount, 1, "order workbook preview skips unpaid or canceled orders");
  assertEqual(orderPreview.totalPaidAmount, 86, "order workbook preview sums paid amount");
  assert(orderPreview.csv.includes("拿铁"), "order workbook preview exports normalized CSV");

  const workbook = XLSX.read(buildBusinessAnalysisXlsx(businessAnalysisFixture()), { type: "buffer", cellFormula: true });
  assertEqual(workbook.SheetNames.join(","), "利润表,现金流量表,逻辑校验", "business analysis workbook has expected sheets");
  assertCell(workbook, "利润表", "B4", "SUM(B5:B8)", 15049);
  assertCell(workbook, "利润表", "B15", "B4-B9", 10549);
  assertCell(workbook, "现金流量表", "B7", "SUM(B5:B6)", 15049);
  assertCell(workbook, "现金流量表", "B13", "B7-B12", 5968);
  assertEqual(String(workbook.Sheets["逻辑校验"].E3.v), "通过", "business analysis checks sheet renders status");
}

function requireTemp(modulePath) {
  return require(path.join(tempRoot, `${modulePath}.js`));
}

function workbookFile(name, rows) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Worksheet");
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new File([new Blob([data])], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function orderWorkbookFile() {
  return workbookFile("店内订单列表.xls", [
    ["流水号", "订单类型", "所属门店", "下单人信息", "手机号码", "应付金额(元)", "实付金额(元)", "优惠金额(元)", "支付状态", "支付方式", "商品信息", "下单时间", "就餐类型", "订单状态", "就餐方式", "桌位号", "就餐人数", "订单来源", "商家备注"],
    ["Q1", "叫号取餐", "香律Cafe&Bar", "", "", 86, 86, 0, "已支付", "微信", "拿铁 x1,Gin Tonic x1", "2026-05-14 15:31:47", "叫号取餐", "已完成", "店内就餐", "", "0人", "收银台", ""],
    ["Q2", "叫号取餐", "香律Cafe&Bar", "", "", 21, 21, 0, "未支付", "微信", "美式（深烘） x1", "2026-05-14 16:31:47", "叫号取餐", "已取消", "店内就餐", "", "0人", "收银台", ""],
  ]);
}

function businessAnalysisFixture() {
  return {
    month: "2026-11",
    monthLabel: "2026年11月",
    rangeLabel: "2026-11-01 - 2026-11-30",
    profitLoss: {
      store_id: "store",
      month: "2026-11-01",
      revenue: 15049,
      material_cost: 4500,
      gross_profit: 10549,
      gross_margin: 70.1,
      labor_cost: 3500,
      rent_cost: 4200,
      utility_cost: 800,
      marketing_cost: 400,
      other_cost: 181,
      net_profit: 1468,
    },
    revenueByProductGroup: { coffee: 9029.4, nonCoffee: 3762.25, food: 1504.9, other: 752.45 },
    revenueByChannel: { 堂食: 10000, 小程序: 3000, 美团: 1500, 饿了么: 549 },
    expensesByCategory: { 工资: 3500, 房租: 4200, 水电: 800, 营销: 400, 其他: 181 },
    expenseNotesByCategory: { 工资: "员工工资" },
    cashflow: {
      transactions: [
        { transaction_date: "2026-11-01", direction: "income", category: "销售", amount: 15049, payment_method: "微信", reference_type: "sales_order", reference_id: "s1", created_at: "2026-11-01" },
        { transaction_date: "2026-11-02", direction: "expense", category: "采购", amount: 4181, payment_method: "微信", reference_type: "purchase_order", reference_id: "p1", created_at: "2026-11-02" },
        { transaction_date: "2026-11-05", direction: "expense", category: "工资", amount: 3500, payment_method: "银行卡", reference_type: "expense_record", reference_id: "e1", created_at: "2026-11-05" },
        { transaction_date: "2026-11-06", direction: "expense", category: "其他", amount: 1400, payment_method: "支付宝", reference_type: "expense_record", reference_id: "e2", created_at: "2026-11-06" },
      ],
      total_income: 15049,
      total_expense: 9081,
      net_cashflow: 5968,
      income_by_category: { 销售: 15049 },
      expense_by_category: { 采购: 4181, 工资: 3500, 其他: 1400 },
    },
    checks: [
      { key: "revenue_product_group", label: "收入结构合计 = 利润表收入", expected: 15049, actual: 15049, difference: 0, status: "ok", message: "一致" },
      { key: "gross_profit", label: "毛利 = 收入 - 原料成本", expected: 10549, actual: 10549, difference: 0, status: "ok", message: "一致" },
    ],
  };
}

function assertCell(workbook, sheetName, address, formula, value) {
  const cell = workbook.Sheets[sheetName][address];
  assert(cell, `${sheetName}!${address} exists`);
  assertEqual(cell.f, formula, `${sheetName}!${address} formula`);
  assertEqual(Number(cell.v), value, `${sheetName}!${address} value`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  console.log(`✓ ${message}`);
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  console.log(`✓ ${message}`);
}
