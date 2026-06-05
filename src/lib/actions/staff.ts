"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidateAndReturn } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createAdminClient, createClient, hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/server";

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

const employeeAccountSchema = z.object({
  employee_id: z.string().uuid(),
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const employeePasswordResetSchema = z.object({
  employee_id: z.string().uuid(),
  password: z.string().min(8),
});

export async function createEmployeeAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
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
  requirePermission(profile, "shift.manage");
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
  requirePermission(profile, "commission.manage");
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

export async function createEmployeeAccountAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const payload = employeeAccountSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    await revalidateAndReturn(["/employees"], "/employees");
  }

  const supabase = await createClient();
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, store_id, name, phone, profile_id")
    .eq("id", payload.employee_id)
    .eq("store_id", profile.store_id)
    .single();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message ?? "员工不存在");
  }

  if (employee.profile_id) {
    throw new Error("该员工已经绑定登录账号");
  }

  const { error: inviteError } = await supabase.from("employee_account_invites").upsert(
    {
      tenant_id: profile.tenant_id,
      store_id: profile.store_id,
      employee_id: payload.employee_id,
      email: payload.email,
      role: "staff",
      status: "pending",
      invited_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,employee_id" },
  );

  if (inviteError) throw new Error(inviteError.message);

  if (!hasSupabaseAdminEnv()) {
    await revalidateAndReturn(["/employees"], "/employees");
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      display_name: employee.name,
      store_id: profile.store_id,
      tenant_id: profile.tenant_id,
      role: "staff",
    },
  });

  if (createError || !created.user) {
    throw new Error(createError?.message ?? "创建 Supabase 用户失败");
  }

  const authUserId = created.user.id;
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUserId,
    tenant_id: profile.tenant_id,
    store_id: profile.store_id,
    role: "staff",
    display_name: employee.name,
    phone: employee.phone,
    status: "active",
  });

  if (profileError) throw new Error(profileError.message);

  const { error: membershipError } = await supabase.from("store_memberships").insert({
    tenant_id: profile.tenant_id,
    store_id: profile.store_id,
    profile_id: authUserId,
    role: "staff",
    status: "active",
  });

  if (membershipError) throw new Error(membershipError.message);

  const { error: bindError } = await supabase
    .from("employees")
    .update({ profile_id: authUserId })
    .eq("id", payload.employee_id)
    .eq("store_id", profile.store_id);

  if (bindError) throw new Error(bindError.message);

  const { error: updateInviteError } = await supabase
    .from("employee_account_invites")
    .update({
      auth_user_id: authUserId,
      status: "created",
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", profile.store_id)
    .eq("employee_id", payload.employee_id);

  if (updateInviteError) throw new Error(updateInviteError.message);

  await revalidateAndReturn(["/employees"], "/employees");
}

export async function resetEmployeePasswordAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const payload = employeePasswordResetSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    await revalidateAndReturn(["/employees"], "/employees");
  }

  if (!hasSupabaseAdminEnv()) {
    throw new Error("重置员工密码需要配置 SUPABASE_SERVICE_ROLE_KEY。");
  }

  const supabase = await createClient();
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, store_id, profile_id")
    .eq("id", payload.employee_id)
    .eq("store_id", profile.store_id)
    .single();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message ?? "员工不存在");
  }

  if (!employee.profile_id) {
    throw new Error("该员工尚未绑定登录账号");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(employee.profile_id, {
    password: payload.password,
  });

  if (error) throw new Error(error.message);

  await revalidateAndReturn(["/employees"], "/employees");
}
