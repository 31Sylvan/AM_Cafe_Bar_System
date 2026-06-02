import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { getCashflowSummary, listProfitLoss } from "@/lib/data/finance";
import { listWasteSummary } from "@/lib/data/reports";

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    today: now.toISOString().slice(0, 10),
    start: start.toISOString().slice(0, 10),
    next: next.toISOString().slice(0, 10),
    dayOfMonth: now.getDate(),
    daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  };
}

export async function getDashboardMetrics(includeFinancials: boolean) {
  if (!hasSupabaseEnv()) {
    return {
      todayRevenue: 0,
      monthRevenue: 0,
      grossMargin: 0,
      materialCostRate: 0,
      wasteRate: 0,
      cashBalance: 0,
      estimatedMonthProfit: 0,
    };
  }

  const supabase = await createClient();
  const range = monthRange();

  const [{ data: todaySales, error: todayError }, { data: monthSales, error: monthError }] = await Promise.all([
    supabase.from("sales_orders").select("total_amount").eq("sale_date", range.today).neq("status", "void"),
    supabase.from("sales_orders").select("total_amount").gte("sale_date", range.start).lt("sale_date", range.next).neq("status", "void"),
  ]);

  if (todayError) throw new Error(todayError.message);
  if (monthError) throw new Error(monthError.message);

  const todayRevenue = (todaySales ?? []).reduce((sum, row) => sum + Number(row.total_amount), 0);
  const monthRevenue = (monthSales ?? []).reduce((sum, row) => sum + Number(row.total_amount), 0);

  if (!includeFinancials) {
    return {
      todayRevenue,
      monthRevenue,
      grossMargin: 0,
      materialCostRate: 0,
      wasteRate: 0,
      cashBalance: 0,
      estimatedMonthProfit: 0,
    };
  }

  const [profitLoss, cashflow, waste] = await Promise.all([listProfitLoss(), getCashflowSummary(), listWasteSummary()]);
  const currentMonthProfit = profitLoss[0];
  const wasteAmount = waste.reduce((sum, row) => sum + Number(row.waste_amount), 0);
  const materialCostRate = monthRevenue > 0 ? (Number(currentMonthProfit?.material_cost ?? 0) / monthRevenue) * 100 : 0;
  const wasteRate = monthRevenue > 0 ? (wasteAmount / monthRevenue) * 100 : 0;
  const estimatedMonthProfit =
    range.dayOfMonth > 0 ? (Number(currentMonthProfit?.net_profit ?? 0) / range.dayOfMonth) * range.daysInMonth : 0;

  return {
    todayRevenue,
    monthRevenue,
    grossMargin: Number(currentMonthProfit?.gross_margin ?? 0),
    materialCostRate,
    wasteRate,
    cashBalance: Number(cashflow?.cash_balance ?? 0),
    estimatedMonthProfit,
  };
}
