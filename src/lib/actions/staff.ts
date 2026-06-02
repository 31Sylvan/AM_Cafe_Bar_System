"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwner, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const employeeSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  position: z.string().trim().min(1),
  hourly_rate: z.coerce.number().min(0),
  hire_date: z.string().min(1),
});

const shiftSchema = z.object({
  employee_id: z.string().uuid(),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  role: z.string().trim().min(1),
});

const commissionRuleSchema = z.object({
  month: z.string().min(1),
  revenue_target: z.coerce.number().min(0),
  bonus_pool_rate: z.coerce.number().min(0).max(1),
});

export async function createEmployeeAction(formData: FormData) {
  const profile = await requireProfile();
  requireOwner(profile);
  const payload = employeeSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/employees");
    redirect("/employees");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert({
    store_id: profile.store_id,
    ...payload,
    phone: payload.phone || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/employees");
  redirect("/employees");
}

export async function createShiftAction(formData: FormData) {
  const profile = await requireProfile();
  requireOwner(profile);
  const payload = shiftSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/shifts");
    redirect("/shifts");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("shifts").insert({
    store_id: profile.store_id,
    ...payload,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/shifts");
  redirect("/shifts");
}

export async function createCommissionRuleAction(formData: FormData) {
  const profile = await requireProfile();
  requireOwner(profile);
  const payload = commissionRuleSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/commissions");
    redirect("/commissions");
  }

  const supabase = await createClient();
  const month = `${payload.month}-01`;
  const { data: rule, error } = await supabase
    .from("commission_rules")
    .insert({
      store_id: profile.store_id,
      month,
      revenue_target: payload.revenue_target,
      bonus_pool_rate: payload.bonus_pool_rate,
    })
    .select("id")
    .single();

  if (error || !rule) throw new Error(error?.message ?? "创建提成规则失败");

  await supabase.rpc("calculate_commission_allocations", { p_rule_id: rule.id });

  revalidatePath("/commissions");
  redirect("/commissions");
}
