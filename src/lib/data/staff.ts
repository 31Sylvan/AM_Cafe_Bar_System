import { requireProfile } from "@/lib/auth";
import { createAdminClient, createClient, hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoCommissionRules, demoEmployeePerformance, demoEmployees, demoShifts } from "@/lib/demo-data";
import type { CommissionRule, Employee, EmployeeAccountInvite, EmployeePerformance, Shift, Store } from "@/lib/types";

export type EmployeeWithStore = Employee & {
  stores?: Pick<Store, "id" | "name" | "status"> | null;
};

export async function listEmployees(options: { scope?: "current" | "tenant" } = {}) {
  if (!hasSupabaseEnv()) return demoEmployees;

  const profile = await requireProfile();
  const supabase = await createClient();
  const scope = options.scope ?? "current";

  if (scope === "tenant" && profile.role === "owner" && hasSupabaseAdminEnv()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employees")
      .select("*, stores!inner(id, name, status, tenant_id)")
      .eq("stores.tenant_id", profile.tenant_id)
      .eq("stores.status", "active")
      .order("store_id")
      .order("status")
      .order("name");

    if (error) throw new Error(error.message);
    return ((data ?? []) as EmployeeWithStore[]).filter((employee) => employee.stores?.status === "active");
  }

  const { data, error } = await supabase
    .from("employees")
    .select("*, stores(id, name, status)")
    .eq("store_id", profile.store_id)
    .order("status")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as EmployeeWithStore[];
}

export async function getEmployeeForEdit(employeeId: string) {
  if (!hasSupabaseEnv()) {
    return demoEmployees.find((employee) => employee.id === employeeId) ?? null;
  }

  const profile = await requireProfile();

  if (hasSupabaseAdminEnv()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employees")
      .select("*, stores!inner(id, name, status, tenant_id)")
      .eq("id", employeeId)
      .eq("stores.tenant_id", profile.tenant_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as EmployeeWithStore | null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*, stores(id, name, status)")
    .eq("id", employeeId)
    .eq("store_id", profile.store_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as EmployeeWithStore | null;
}

export async function listEmployeeAccountInvites(options: { scope?: "current" | "tenant" } = {}) {
  if (!hasSupabaseEnv()) return [] satisfies EmployeeAccountInvite[];

  const profile = await requireProfile();
  const supabase = await createClient();
  const scope = options.scope ?? "current";

  if (scope === "tenant" && profile.role === "owner" && hasSupabaseAdminEnv()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employee_account_invites")
      .select("*, stores!inner(id, tenant_id, status)")
      .eq("stores.tenant_id", profile.tenant_id)
      .eq("stores.status", "active")
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as EmployeeAccountInvite[];
  }

  const { data, error } = await supabase
    .from("employee_account_invites")
    .select("*")
    .eq("store_id", profile.store_id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as EmployeeAccountInvite[];
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

export async function getShiftForEdit(shiftId: string) {
  if (!hasSupabaseEnv()) return demoShifts.find((shift) => shift.id === shiftId) ?? null;

  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("*, employees(name, position)")
    .eq("id", shiftId)
    .eq("store_id", profile.store_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Shift | null;
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
