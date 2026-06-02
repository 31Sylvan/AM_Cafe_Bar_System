import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoCommissionRules, demoEmployeePerformance, demoEmployees, demoShifts } from "@/lib/demo-data";
import type { CommissionRule, Employee, EmployeePerformance, Shift } from "@/lib/types";

export async function listEmployees() {
  if (!hasSupabaseEnv()) return demoEmployees;

  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select("*").order("status").order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Employee[];
}

export async function listShifts() {
  if (!hasSupabaseEnv()) return demoShifts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("*, employees(name, position)")
    .order("start_time", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as Shift[];
}

export async function listEmployeePerformance() {
  if (!hasSupabaseEnv()) return demoEmployeePerformance;

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_employee_performance").select("*").order("revenue_per_hour", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as EmployeePerformance[];
}

export async function listCommissionRules() {
  if (!hasSupabaseEnv()) return demoCommissionRules;

  const supabase = await createClient();
  const { data, error } = await supabase.from("commission_rules").select("*").order("month", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CommissionRule[];
}
