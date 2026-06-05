import * as XLSX from "xlsx";
import type { BusinessAnalysisData } from "@/lib/data/finance";

type CellValue = string | number | null;

export function buildBusinessAnalysisXlsx(data: BusinessAnalysisData) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildProfitSheet(data), "利润表");
  XLSX.utils.book_append_sheet(workbook, buildCashflowSheet(data), "现金流量表");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

function buildProfitSheet(data: BusinessAnalysisData) {
  const p = data.profitLoss;
  const expenses = data.expensesByCategory;
  const notes = data.expenseNotesByCategory;
  const revenue = data.revenueByProductGroup;
  const channelRows = Object.entries(data.revenueByChannel);
  const sheet = XLSX.utils.aoa_to_sheet([
    [`香律——${data.monthLabel}利润表`, "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["项目", "金额（元）", "备注", "", "", "", "", "营业收入", ""],
    ["一、营业收入", null, "所有销售带来的收入", "", "", "", "", "", ""],
    ["咖啡饮品收入", revenue.coffee, "咖啡类饮品收入", "", "", "", "", channelRows[0]?.[0] ?? "", channelRows[0]?.[1] ?? ""],
    ["非咖啡饮品收入", revenue.nonCoffee, "茶饮、酒类等非咖啡饮品收入", "", "", "", "", channelRows[1]?.[0] ?? "", channelRows[1]?.[1] ?? ""],
    ["食品销售", revenue.food, "甜品、轻食、佐酒小食等销售金额", "", "", "", "", channelRows[2]?.[0] ?? "", channelRows[2]?.[1] ?? ""],
    ["其他收入", revenue.other, "其他经营收入", "", "", "", "", channelRows[3]?.[0] ?? "", channelRows[3]?.[1] ?? ""],
    ["二、营业成本", null, "与销售产品直接相关的成本", "", "", "", "", "", ""],
    ["1.原材料采购成本", p.material_cost, "系统按实际成本口径汇总", "", "", "", "", "", ""],
    ["（1）咖啡饮品成本", "", "咖啡豆、牛奶、糖浆等", "", "", "", "", "", ""],
    ["（2）非咖啡饮品成本", "", "茶叶、气泡水、酒类等", "", "", "", "", "", ""],
    ["（3）食品原材料成本", "", "甜品、轻食等", "", "", "", "", "", ""],
    ["2.包装成本", "", "咖啡杯、吸管、包装袋等成本；如已纳入原料成本则留空", "", "", "", "", "", ""],
    ["三、毛利", null, "", "", "", "", "", "", ""],
    ["四、毛利率", null, "", "", "", "", "", "", ""],
    ["五、营业费用", null, "日常运营产生的费用", "", "", "", "", "", ""],
    ["1.人员费用", p.labor_cost, notes["工资"] || "工资、绩效、提成等", "", "", "", "", "", ""],
    ["2.店铺租金", p.rent_cost, notes["房租"] || "房租", "", "", "", "", "", ""],
    ["3.水电费", p.utility_cost, notes["水电"] || "水电杂费", "", "", "", "", "", ""],
    ["4.物业管理费", expenses["物业"] ?? 0, notes["物业"] || "物业管理费", "", "", "", "", "", ""],
    ["5.设备折旧及维护费用", expenses["设备"] ?? 0, notes["设备"] || "设备维护、折旧分摊", "", "", "", "", "", ""],
    ["6.营销推广费用", p.marketing_cost, notes["营销"] || "广告、促销、平台活动等", "", "", "", "", "", ""],
    ["六、营业利润", null, "", "", "", "", "", "", ""],
    ["七、其他收益", "", "", "", "", "", "", "", ""],
    ["八、其他支出", p.other_cost, notes["其他"] || "其他未分类支出", "", "", "", "", "", ""],
    ["九、利润总额", null, "", "", "", "", "", "", ""],
    ["十、所得税费用", 0, "如未计提则为 0", "", "", "", "", "", ""],
    ["十一、净利润", null, "", "", "", "", "", "", ""],
    ["十二、净利率", null, "", "", "", "", "", "", ""],
  ] satisfies CellValue[][]);

  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }];
  sheet["!cols"] = [
    { wch: 28 },
    { wch: 16 },
    { wch: 52 },
    { wch: 4 },
    { wch: 4 },
    { wch: 4 },
    { wch: 4 },
    { wch: 18 },
    { wch: 16 },
  ];

  setFormula(sheet, "B4", "SUM(B5:B8)", p.revenue);
  setFormula(sheet, "B9", "SUM(B10:B14)", p.material_cost);
  setFormula(sheet, "B15", "B4-B9", p.gross_profit);
  setFormula(sheet, "B16", "IF(B4>0,B15/B4,0)", Number(p.gross_margin) / 100, "0.00%");
  setFormula(sheet, "B17", "SUM(B18:B23)", p.labor_cost + p.rent_cost + p.utility_cost + p.marketing_cost + (expenses["物业"] ?? 0) + (expenses["设备"] ?? 0));
  setFormula(sheet, "B24", "B15-B17", p.gross_profit - (p.labor_cost + p.rent_cost + p.utility_cost + p.marketing_cost + (expenses["物业"] ?? 0) + (expenses["设备"] ?? 0)));
  setFormula(sheet, "B27", "B24+B25-B26", p.net_profit);
  setFormula(sheet, "B29", "B27-B28", p.net_profit);
  setFormula(sheet, "B30", "IF(B4>0,B29/B4,0)", Number(p.revenue) > 0 ? Number(p.net_profit) / Number(p.revenue) : 0, "0.00%");
  formatMoney(sheet, ["B4:B15", "B17:B29", "I5:I8"]);
  markHeaders(sheet, ["A3:C3", "H3:I3"]);
  return sheet;
}

function buildCashflowSheet(data: BusinessAnalysisData) {
  const statement = data.cashflow;
  const categoryTotal = (category: string) =>
    statement.transactions
      .filter((row) => row.direction === "expense" && row.category === category)
      .reduce((sum, row) => sum + Number(row.amount), 0);
  const purchase = categoryTotal("采购");
  const labor = categoryTotal("工资");
  const otherOperating = Math.max(0, statement.total_expense - purchase - labor);
  const sheet = XLSX.utils.aoa_to_sheet([
    ["咖啡店月度现金流量表", "", "", "", "", "", ""],
    [`时间：${data.rangeLabel}`, "", "", "", "", "", ""],
    ["项目", "金额", "备注说明", "", "", "", ""],
    ["一、经营活动产生的现金流量", "", "", "", "", "", ""],
    ["销售商品、提供劳务收到的现金", statement.total_income, "本月堂食、外卖及线上平台实际收到的全部款项", "", "", "", ""],
    ["经营活动现金流入小计", null, "", "", "", "", ""],
    ["购买商品、接受劳务支付的现金", purchase, "咖啡豆、牛奶、糖浆、酒水、包装杯具等采购支出", "", "", "", ""],
    ["支付给员工的现金", labor, "员工工资、绩效、提成等", "", "", "", ""],
    ["支付的各种税费", 0, "实际缴纳的税费；未录入则为 0", "", "", "", ""],
    ["支付其他与经营活动有关的现金", otherOperating, "房租、水电、营销、物业、维修等经营支出", "", "", "", ""],
    ["经营活动现金流出小计", null, "", "", "", "", ""],
    ["经营活动产生的现金流量净额", null, "", "", "", "", ""],
    ["二、投资活动产生的现金流量", "", "", "", "", "", ""],
    ["处置固定资产收到的现金", 0, "", "", "", "", ""],
    ["投资活动现金流入小计", null, "", "", "", "", ""],
    ["购建固定资产、无形资产支付的现金", 0, "购买新设备、店面升级改造等", "", "", "", ""],
    ["投资活动现金流出小计", null, "", "", "", "", ""],
    ["投资活动产生的现金流量净额", null, "", "", "", "", ""],
    ["三、融资活动产生的现金流量", "", "", "", "", "", ""],
    ["吸收投资收到的现金", 0, "", "", "", "", ""],
    ["取得借款收到的现金", 0, "", "", "", "", ""],
    ["分配股利、利润或偿付利息支付的现金", 0, "", "", "", "", ""],
    ["融资活动现金流出小计", null, "", "", "", "", ""],
    ["融资活动产生的现金流量净额", null, "", "", "", "", ""],
    ["四、现金净增加额", null, "", "", "", "", ""],
    ["加：期初现金余额", "", "如需完整资产负债口径，可在此手工填入期初现金", "", "", "", ""],
    ["五、期末现金余额", null, "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["现金流水明细", "", "", "", "", "", ""],
    ["日期", "方向", "分类", "金额", "支付方式", "来源类型", "来源ID"],
    ...statement.transactions.map((row) => [
      row.transaction_date,
      row.direction === "income" ? "收入" : "支出",
      row.category,
      row.amount,
      row.payment_method,
      row.reference_type,
      row.reference_id,
    ]),
  ] satisfies CellValue[][]);

  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];
  sheet["!cols"] = [
    { wch: 42 },
    { wch: 16 },
    { wch: 58 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 38 },
  ];

  setFormula(sheet, "B6", "SUM(B5)", statement.total_income);
  setFormula(sheet, "B11", "SUM(B7:B10)", statement.total_expense);
  setFormula(sheet, "B12", "B6-B11", statement.net_cashflow);
  setFormula(sheet, "B15", "SUM(B14)", 0);
  setFormula(sheet, "B17", "SUM(B16)", 0);
  setFormula(sheet, "B18", "B15-B17", 0);
  setFormula(sheet, "B23", "SUM(B22)", 0);
  setFormula(sheet, "B24", "SUM(B20:B21)-B23", 0);
  setFormula(sheet, "B25", "B12+B18+B24", statement.net_cashflow);
  setFormula(sheet, "B27", "IF(B26=\"\",B25,B26+B25)", statement.net_cashflow);
  formatMoney(sheet, ["B5:B27", "D31:D300"]);
  markHeaders(sheet, ["A3:C3", "A30:G30"]);
  return sheet;
}

function setFormula(sheet: XLSX.WorkSheet, address: string, formula: string, value: number, format?: string) {
  sheet[address] = { t: "n", f: formula, v: Number.isFinite(value) ? Number(value.toFixed(4)) : 0, z: format };
}

function formatMoney(sheet: XLSX.WorkSheet, ranges: string[]) {
  for (const range of ranges) {
    const decoded = XLSX.utils.decode_range(range);
    for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
      for (let col = decoded.s.c; col <= decoded.e.c; col += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        if (sheet[address]) sheet[address].z = '#,##0.00;[Red]-#,##0.00;""';
      }
    }
  }
}

function markHeaders(sheet: XLSX.WorkSheet, ranges: string[]) {
  for (const range of ranges) {
    const decoded = XLSX.utils.decode_range(range);
    for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
      for (let col = decoded.s.c; col <= decoded.e.c; col += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        if (!sheet[address]) sheet[address] = { t: "s", v: "" };
        sheet[address].s = { font: { bold: true } };
      }
    }
  }
}
