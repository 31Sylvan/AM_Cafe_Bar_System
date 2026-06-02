import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoCashflowSummary, demoCostSummary, demoExpenseRecords, demoMonthCloseSnapshots, demoProfitLoss } from "@/lib/demo-data";
import type { CashflowSummary, CostSummary, ExpenseRecord, MonthCloseSnapshot, ProfitLoss } from "@/lib/types";

export async function listExpenseRecords() {
  if (!hasSupabaseEnv()) return demoExpenseRecords;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_records")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseRecord[];
}

export async function listCostSummary() {
  if (!hasSupabaseEnv()) return demoCostSummary;

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_cost_summary_monthly").select("*").order("month", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CostSummary[];
}

export async function listProfitLoss() {
  if (!hasSupabaseEnv()) return demoProfitLoss;

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_profit_loss_monthly").select("*").order("month", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProfitLoss[];
}

export async function getCashflowSummary() {
  if (!hasSupabaseEnv()) return demoCashflowSummary;

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_cashflow_summary").select("*").maybeSingle();

  if (error) throw new Error(error.message);
  return data as CashflowSummary | null;
}

export async function getCashflowForecast(days = 30) {
  if (!hasSupabaseEnv()) {
    return Array.from({ length: days }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index + 1);

      return {
        date: date.toISOString().slice(0, 10),
        projected_balance: demoCashflowSummary.cash_balance + 260 * (index + 1),
      };
    });
  }

  const supabase = await createClient();
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 30);

  const [cashflow, transactionsResult] = await Promise.all([
    getCashflowSummary(),
    supabase
      .from("cash_transactions")
      .select("direction, amount")
      .gte("transaction_date", start.toISOString().slice(0, 10))
      .lte("transaction_date", now.toISOString().slice(0, 10)),
  ]);

  if (transactionsResult.error) throw new Error(transactionsResult.error.message);

  const transactions = transactionsResult.data ?? [];
  const income = transactions
    .filter((row) => row.direction === "income")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const expense = transactions
    .filter((row) => row.direction === "expense")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const dailyNet = (income - expense) / 30;
  const currentBalance = Number(cashflow?.cash_balance ?? 0);

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index + 1);

    return {
      date: date.toISOString().slice(0, 10),
      projected_balance: currentBalance + dailyNet * (index + 1),
    };
  });
}

export async function listMonthCloseSnapshots() {
  if (!hasSupabaseEnv()) return demoMonthCloseSnapshots;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("month_close_snapshots")
    .select("*")
    .order("month", { ascending: false })
    .limit(36);

  if (error) throw new Error(error.message);
  return (data ?? []) as MonthCloseSnapshot[];
}
