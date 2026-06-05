import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/export/csv";
import {
  getCashflowStatement,
  listCostSummary,
  listExpenseRecords,
  listMonthCloseSnapshots,
  listProfitLossByFilter,
} from "@/lib/data/finance";
import { listInventoryBalances, listInventoryMovements, listReplenishmentSuggestions } from "@/lib/data/inventory";
import { listProductSalesReport, listWasteSummary } from "@/lib/data/reports";
import { listEmployeePerformance } from "@/lib/data/staff";

export const dynamic = "force-dynamic";

const ownerOnlyReports = new Set(["profit-loss", "cashflow", "expenses", "costs", "employees", "month-close", "replenishment"]);

export async function GET(request: Request, { params }: { params: Promise<{ report: string }> }) {
  const profile = await requireProfile();
  const { report } = await params;
  const searchParams = new URL(request.url).searchParams;
  const month = cleanMonth(searchParams.get("month"));
  const from = cleanDate(searchParams.get("from"));
  const to = cleanDate(searchParams.get("to"));

  if (ownerOnlyReports.has(report) && profile.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  switch (report) {
    case "inventory": {
      const rows = await listInventoryBalances();
      return csvResponse(
        "inventory.csv",
        toCsv(
          ["原料", "分类", "单位", "当前库存", "安全库存", "参考成本", "库存价值", "预警"],
          rows.map((row) => [
            row.name,
            row.category,
            row.unit,
            row.current_qty,
            row.safe_stock,
            row.cost_price,
            row.inventory_value,
            row.is_low_stock ? "是" : "否",
          ]),
        ),
      );
    }
    case "movements": {
      const rows = await listInventoryMovements();
      return csvResponse(
        "inventory-movements.csv",
        toCsv(
          ["时间", "原料", "分类", "类型", "变动数量", "变动前", "变动后", "来源"],
          rows.map((row) => [
            row.created_at,
            row.inventory_items?.name ?? row.item_id,
            row.inventory_items?.category ?? "",
            row.movement_type,
            row.qty,
            row.before_qty,
            row.after_qty,
            row.reference_type,
          ]),
        ),
      );
    }
    case "products": {
      const rows = await listProductSalesReport();
      return csvResponse(
        "products.csv",
        toCsv(
          ["产品", "分类", "销量", "销售额", "理论成本", "毛利", "毛利率"],
          rows.map((row) => [
            row.name,
            row.category,
            row.sales_qty,
            row.sales_amount,
            row.theoretical_cost,
            row.gross_profit,
            `${row.gross_margin}%`,
          ]),
        ),
      );
    }
    case "waste": {
      const rows = await listWasteSummary();
      return csvResponse(
        "waste.csv",
        toCsv(
          ["原料", "分类", "单位", "损耗数量", "损耗金额", "损耗次数"],
          rows.map((row) => [row.name, row.category, row.unit, row.waste_qty, row.waste_amount, row.waste_count]),
        ),
      );
    }
    case "employees": {
      const rows = await listEmployeePerformance();
      return csvResponse(
        "employees.csv",
        toCsv(
          ["员工", "总工时", "班次数", "班次营业额", "营业额/小时", "迟到次数", "请假次数"],
          rows.map((row) => [
            row.name,
            row.total_hours,
            row.shift_count,
            row.shift_revenue,
            row.revenue_per_hour,
            row.late_count,
            row.leave_count,
          ]),
        ),
      );
    }
    case "profit-loss": {
      const rows = await listProfitLossByFilter({ month });
      return csvResponse(
        `profit-loss${month ? `-${month}` : ""}.csv`,
        toCsv(
          ["月份", "收入", "原料成本", "毛利", "毛利率", "人工", "房租", "水电", "营销", "其他", "净利润"],
          rows.map((row) => [
            row.month,
            row.revenue,
            row.material_cost,
            row.gross_profit,
            `${row.gross_margin}%`,
            row.labor_cost,
            row.rent_cost,
            row.utility_cost,
            row.marketing_cost,
            row.other_cost,
            row.net_profit,
          ]),
        ),
      );
    }
    case "costs": {
      const rows = await listCostSummary();
      return csvResponse(
        "costs.csv",
        toCsv(
          ["月份", "理论成本", "实际成本", "成本差异"],
          rows.map((row) => [row.month, row.theoretical_cost, row.actual_cost, row.cost_variance]),
        ),
      );
    }
    case "expenses": {
      const rows = await listExpenseRecords();
      return csvResponse(
        "expenses.csv",
        toCsv(
          ["日期", "分类", "金额", "支付方式", "备注"],
          rows.map((row) => [row.expense_date, row.category, row.amount, row.payment_method, row.note ?? ""]),
        ),
      );
    }
    case "cashflow": {
      const statement = await getCashflowStatement({ month, from, to });
      return csvResponse(
        `cashflow${month ? `-${month}` : ""}.csv`,
        toCsv(
          ["日期", "方向", "分类", "金额", "支付方式", "来源类型", "来源ID", "创建时间"],
          [
            ["汇总", "收入", "", statement.total_income, "", "", "", ""],
            ["汇总", "支出", "", statement.total_expense, "", "", "", ""],
            ["汇总", "净现金流", "", statement.net_cashflow, "", "", "", ""],
            ...statement.transactions.map((row) => [
              row.transaction_date,
              row.direction === "income" ? "收入" : "支出",
              row.category,
              row.amount,
              row.payment_method,
              row.reference_type,
              row.reference_id,
              row.created_at,
            ]),
          ],
        ),
      );
    }
    case "month-close": {
      const rows = await listMonthCloseSnapshots();
      return csvResponse(
        "month-close.csv",
        toCsv(
          ["月份", "收入", "原料成本", "毛利", "毛利率", "人工", "房租", "水电", "营销", "其他", "净利润", "理论成本", "实际成本", "成本差异", "现金余额", "月结时间"],
          rows.map((row) => [
            row.month,
            row.revenue,
            row.material_cost,
            row.gross_profit,
            `${row.gross_margin}%`,
            row.labor_cost,
            row.rent_cost,
            row.utility_cost,
            row.marketing_cost,
            row.other_cost,
            row.net_profit,
            row.theoretical_cost,
            row.actual_cost,
            row.cost_variance,
            row.cash_balance,
            row.closed_at,
          ]),
        ),
      );
    }
    case "replenishment": {
      const rows = await listReplenishmentSuggestions();
      return csvResponse(
        "replenishment.csv",
        toCsv(
          ["原料", "分类", "单位", "当前库存", "安全库存", "日均消耗", "预计可用天数", "建议采购", "建议预算", "优先级"],
          rows.map((row) => [
            row.name,
            row.category,
            row.unit,
            row.current_qty,
            row.safe_stock,
            row.avg_daily_usage,
            row.days_until_stockout ?? "",
            row.suggested_order_qty,
            row.suggested_budget,
            row.priority,
          ]),
        ),
      );
    }
    default:
      return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }
}

function cleanMonth(value: string | null) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

function cleanDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}
