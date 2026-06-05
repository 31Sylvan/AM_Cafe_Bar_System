import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoCashflowSummary, demoCostSummary, demoExpenseRecords, demoMonthCloseSnapshots, demoProfitLoss } from "@/lib/demo-data";
import type { CashflowSummary, CashTransaction, CostSummary, ExpenseRecord, MonthCloseSnapshot, ProfitLoss } from "@/lib/types";

export type FinanceDateFilter = {
  from?: string;
  to?: string;
  month?: string;
};

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

export async function listProfitLossByFilter(filter: Pick<FinanceDateFilter, "month"> = {}) {
  const rows = await listProfitLoss();
  if (!filter.month) return rows;
  return rows.filter((row) => row.month.slice(0, 7) === filter.month);
}

export async function getCashflowSummary() {
  if (!hasSupabaseEnv()) return demoCashflowSummary;

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_cashflow_summary").select("*").maybeSingle();

  if (error) throw new Error(error.message);
  return data as CashflowSummary | null;
}

export async function listCashTransactions(filter: FinanceDateFilter = {}) {
  if (!hasSupabaseEnv()) return [] satisfies CashTransaction[];

  const supabase = await createClient();
  const range = resolveDateRange(filter);
  let query = supabase
    .from("cash_transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (range.from) query = query.gte("transaction_date", range.from);
  if (range.to) query = query.lte("transaction_date", range.to);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as CashTransaction[];
}

export async function getCashflowStatement(filter: FinanceDateFilter = {}) {
  const transactions = await listCashTransactions(filter);
  const totalIncome = transactions
    .filter((row) => row.direction === "income")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const totalExpense = transactions
    .filter((row) => row.direction === "expense")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return {
    transactions,
    total_income: Number(totalIncome.toFixed(2)),
    total_expense: Number(totalExpense.toFixed(2)),
    net_cashflow: Number((totalIncome - totalExpense).toFixed(2)),
  };
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

function resolveDateRange(filter: FinanceDateFilter) {
  if (filter.month && /^\d{4}-\d{2}$/.test(filter.month)) {
    const start = new Date(`${filter.month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);

    return {
      from: `${filter.month}-01`,
      to: end.toISOString().slice(0, 10),
    };
  }

  return {
    from: filter.from,
    to: filter.to,
  };
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
