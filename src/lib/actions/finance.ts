"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePaths } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const expenseSchema = z.object({
  expense_date: z.string().min(1),
  category: z.enum(["采购", "工资", "房租", "水电", "营销", "其他"]),
  amount: z.coerce.number().min(0),
  payment_method: z.enum(["微信", "支付宝", "银行卡", "现金"]),
  note: z.string().trim().optional(),
});

const monthCloseSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

const monthCloseDeleteSchema = z.object({
  snapshot_id: z.string().uuid(),
});

const expenseUpdateSchema = expenseSchema.extend({
  expense_id: z.string().uuid(),
});

const expenseDeleteSchema = z.object({
  expense_id: z.string().uuid(),
});

export async function createExpenseRecordAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "finance.manage");
  const payload = expenseSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/finance");
    revalidatePath("/finance/expenses");
    revalidatePath("/finance/cashflow");
    revalidatePath("/finance/profit-loss");
    redirect("/finance/expenses");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("expense_records").insert({
    store_id: profile.store_id,
    ...payload,
    note: payload.note || null,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/cashflow");
  revalidatePath("/finance/profit-loss");
  redirect("/finance/expenses");
}

export async function updateExpenseRecordAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "finance.manage");
  const payload = expenseUpdateSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/finance");
    revalidatePath("/finance/expenses");
    redirect("/finance/expenses");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_records")
    .update({
      expense_date: payload.expense_date,
      category: payload.category,
      amount: payload.amount,
      payment_method: payload.payment_method,
      note: payload.note || null,
    })
    .eq("id", payload.expense_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/cashflow");
  revalidatePath("/finance/profit-loss");
  redirect("/finance/expenses");
}

export async function deleteExpenseRecordAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "finance.manage");
  const payload = expenseDeleteSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/finance", "/finance/expenses", "/finance/cashflow", "/finance/profit-loss"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_records")
    .delete()
    .eq("id", payload.expense_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/finance", "/finance/expenses", "/finance/cashflow", "/finance/profit-loss"]);
}

export async function createMonthCloseSnapshotAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "finance.manage");
  const payload = monthCloseSchema.parse(Object.fromEntries(formData));
  const month = `${payload.month}-01`;

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/finance/month-close"]);
  }

  const supabase = await createClient();
  const [profitResult, costResult, cashflowResult] = await Promise.all([
    supabase.from("v_profit_loss_monthly").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_cost_summary_monthly").select("*").eq("month", month).maybeSingle(),
    supabase.from("v_cashflow_summary").select("*").maybeSingle(),
  ]);

  if (profitResult.error) throw new Error(profitResult.error.message);
  if (costResult.error) throw new Error(costResult.error.message);
  if (cashflowResult.error) throw new Error(cashflowResult.error.message);

  const profit = profitResult.data;
  const cost = costResult.data;
  const cashflow = cashflowResult.data;

  const { error } = await supabase.from("month_close_snapshots").upsert(
    {
      store_id: profile.store_id,
      month,
      revenue: Number(profit?.revenue ?? 0),
      material_cost: Number(profit?.material_cost ?? 0),
      gross_profit: Number(profit?.gross_profit ?? 0),
      gross_margin: Number(profit?.gross_margin ?? 0),
      labor_cost: Number(profit?.labor_cost ?? 0),
      rent_cost: Number(profit?.rent_cost ?? 0),
      utility_cost: Number(profit?.utility_cost ?? 0),
      marketing_cost: Number(profit?.marketing_cost ?? 0),
      other_cost: Number(profit?.other_cost ?? 0),
      net_profit: Number(profit?.net_profit ?? 0),
      theoretical_cost: Number(cost?.theoretical_cost ?? 0),
      actual_cost: Number(cost?.actual_cost ?? 0),
      cost_variance: Number(cost?.cost_variance ?? 0),
      cash_balance: Number(cashflow?.cash_balance ?? 0),
      closed_by: profile.id,
      closed_at: new Date().toISOString(),
    },
    { onConflict: "store_id,month" },
  );

  if (error) throw new Error(error.message);

  return await revalidatePaths(["/finance/month-close"]);
}

export async function deleteMonthCloseSnapshotAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "finance.manage");
  const payload = monthCloseDeleteSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/finance/month-close"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("month_close_snapshots")
    .delete()
    .eq("id", payload.snapshot_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/finance/month-close"]);
}
