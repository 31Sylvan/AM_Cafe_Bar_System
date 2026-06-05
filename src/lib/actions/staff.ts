"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePaths } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createAdminClient, createClient, hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/server";

const employeeSchema = z.object({
  store_id: z.string().uuid().optional(),
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

const shiftStatusSchema = z.object({
  shift_id: z.string().uuid(),
  status: z.enum(["scheduled", "completed", "canceled"]),
});

const shiftUpdateSchema = shiftSchema.extend({
  shift_id: z.string().uuid(),
  status: z.enum(["scheduled", "completed", "canceled"]),
});

const shiftDeleteSchema = z.object({
  shift_id: z.string().uuid(),
});

const commissionRuleSchema = z.object({
  month: z.string().min(1),
  revenue_target: z.coerce.number().min(0),
  bonus_pool_rate: z.coerce.number().min(0).max(1),
});

const commissionRuleUpdateSchema = commissionRuleSchema.extend({
  rule_id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

const commissionRuleDeleteSchema = z.object({
  rule_id: z.string().uuid(),
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

const employeeStatusSchema = z.object({
  employee_id: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

const employeeDeleteSchema = z.object({
  employee_id: z.string().uuid(),
});

export async function createEmployeeAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const payload = employeeSchema.parse(Object.fromEntries(formData));
  const storeId = payload.store_id || profile.store_id;

  if (!hasSupabaseEnv()) {
    revalidatePath("/employees");
    redirect("/employees");
  }

  const row = {
    store_id: storeId,
    name: payload.name,
    phone: payload.phone || null,
    position: payload.position,
    hourly_rate: payload.hourly_rate,
    hire_date: payload.hire_date,
  };

  if (storeId !== profile.store_id) {
    if (!hasSupabaseAdminEnv()) {
      throw new Error("跨门店新增员工需要配置 SUPABASE_SERVICE_ROLE_KEY。");
    }

    const admin = createAdminClient();
    const { data: store, error: storeError } = await admin
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active")
      .maybeSingle();

    if (storeError) throw new Error(storeError.message);
    if (!store) throw new Error("门店不存在或不属于当前租户。");

    const { error } = await admin.from("employees").insert(row);
    if (error) throw new Error(error.message);

    revalidatePath("/employees");
    redirect("/employees");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert({
    ...row,
    phone: payload.phone || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployeeAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const employeeId = z.string().uuid().parse(formData.get("employee_id"));
  const payload = employeeSchema.parse(Object.fromEntries(formData));
  const storeId = payload.store_id || profile.store_id;

  if (!hasSupabaseEnv()) {
    revalidatePath("/employees");
    redirect("/employees");
  }

  const row = {
    store_id: storeId,
    name: payload.name,
    phone: payload.phone || null,
    position: payload.position,
    hourly_rate: payload.hourly_rate,
    hire_date: payload.hire_date,
  };

  if (hasSupabaseAdminEnv()) {
    const admin = createAdminClient();
    await assertStoreInTenant(admin, storeId, profile.tenant_id);
    await assertEmployeeInTenant(admin, employeeId, profile.tenant_id);

    const { error } = await admin.from("employees").update(row).eq("id", employeeId);
    if (error) throw new Error(error.message);

    revalidatePath("/employees");
    redirect("/employees");
  }

  if (storeId !== profile.store_id) {
    throw new Error("跨门店编辑员工需要配置 SUPABASE_SERVICE_ROLE_KEY。");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update(row)
    .eq("id", employeeId)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);

  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployeeStatusAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const payload = employeeStatusSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/employees"]);
  }

  if (hasSupabaseAdminEnv()) {
    const admin = createAdminClient();
    await assertEmployeeInTenant(admin, payload.employee_id, profile.tenant_id);
    const { error } = await admin.from("employees").update({ status: payload.status }).eq("id", payload.employee_id);
    if (error) throw new Error(error.message);
    return await revalidatePaths(["/employees", "/performance", "/commissions"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ status: payload.status })
    .eq("id", payload.employee_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/employees", "/performance", "/commissions"]);
}

export async function deleteEmployeeAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const payload = employeeDeleteSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/employees"]);
  }

  if (hasSupabaseAdminEnv()) {
    const admin = createAdminClient();
    await assertEmployeeInTenant(admin, payload.employee_id, profile.tenant_id);
    const { error } = await admin.from("employees").update({ status: "inactive" }).eq("id", payload.employee_id);
    if (error) throw new Error(error.message);
    return await revalidatePaths(["/employees", "/performance", "/commissions"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ status: "inactive" })
    .eq("id", payload.employee_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/employees", "/performance", "/commissions"]);
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

export async function updateShiftStatusAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "shift.manage");
  const payload = shiftStatusSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/shifts", "/performance", "/commissions"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ status: payload.status })
    .eq("id", payload.shift_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/shifts", "/performance", "/commissions"]);
}

export async function updateShiftAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "shift.manage");
  const payload = shiftUpdateSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/shifts");
    redirect("/shifts");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      employee_id: payload.employee_id,
      start_time: payload.start_time,
      end_time: payload.end_time,
      role: payload.role,
      status: payload.status,
    })
    .eq("id", payload.shift_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);

  revalidatePath("/shifts");
  revalidatePath("/performance");
  revalidatePath("/commissions");
  redirect("/shifts");
}

export async function deleteShiftAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "shift.manage");
  const payload = shiftDeleteSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/shifts", "/performance", "/commissions"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", payload.shift_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/shifts", "/performance", "/commissions"]);
}

export async function createCommissionRuleAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "commission.manage");
  const payload = commissionRuleSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/commissions"]);
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

  return await revalidatePaths(["/commissions"]);
}

export async function updateCommissionRuleAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "commission.manage");
  const payload = commissionRuleUpdateSchema.parse(Object.fromEntries(formData));
  const month = `${payload.month}-01`;

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/commissions"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_rules")
    .update({
      month,
      revenue_target: payload.revenue_target,
      bonus_pool_rate: payload.bonus_pool_rate,
      status: payload.status,
    })
    .eq("id", payload.rule_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);

  if (payload.status === "active") {
    await supabase.rpc("calculate_commission_allocations", { p_rule_id: payload.rule_id });
  }

  return await revalidatePaths(["/commissions", "/performance"]);
}

export async function deleteCommissionRuleAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "commission.manage");
  const payload = commissionRuleDeleteSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/commissions"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_rules")
    .delete()
    .eq("id", payload.rule_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/commissions", "/performance"]);
}

export async function createEmployeeAccountAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const payload = employeeAccountSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/employees"]);
  }

  const admin = hasSupabaseAdminEnv() ? createAdminClient() : null;
  const supabase = await createClient();
  const employeeQuery = admin ?? supabase;
  const { data: employee, error: employeeError } = await employeeQuery
    .from("employees")
    .select("id, store_id, name, phone, profile_id, stores!inner(tenant_id)")
    .eq("id", payload.employee_id)
    .maybeSingle();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message ?? "员工不存在");
  }

  const employeeTenantId = (employee.stores as { tenant_id?: string } | null)?.tenant_id;
  if (employeeTenantId !== profile.tenant_id) {
    throw new Error("员工不属于当前租户。");
  }

  if (employee.profile_id) {
    throw new Error("该员工已经绑定登录账号");
  }

  const writeClient = admin ?? supabase;
  const { error: inviteError } = await writeClient.from("employee_account_invites").upsert(
    {
      tenant_id: profile.tenant_id,
      store_id: employee.store_id,
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

  if (!admin) {
    return await revalidatePaths(["/employees"]);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      display_name: employee.name,
      store_id: employee.store_id,
      tenant_id: profile.tenant_id,
      role: "staff",
    },
  });

  if (createError || !created.user) {
    throw new Error(createError?.message ?? "创建 Supabase 用户失败");
  }

  const authUserId = created.user.id;
  const { error: profileError } = await admin.from("profiles").insert({
    id: authUserId,
    tenant_id: profile.tenant_id,
    store_id: employee.store_id,
    role: "staff",
    display_name: employee.name,
    phone: employee.phone,
    status: "active",
  });

  if (profileError) throw new Error(profileError.message);

  const { error: membershipError } = await admin.from("store_memberships").insert({
    tenant_id: profile.tenant_id,
    store_id: employee.store_id,
    profile_id: authUserId,
    role: "staff",
    status: "active",
  });

  if (membershipError) throw new Error(membershipError.message);

  const { error: bindError } = await admin
    .from("employees")
    .update({ profile_id: authUserId })
    .eq("id", payload.employee_id)
    .eq("store_id", employee.store_id);

  if (bindError) throw new Error(bindError.message);

  const { error: updateInviteError } = await admin
    .from("employee_account_invites")
    .update({
      auth_user_id: authUserId,
      status: "created",
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", employee.store_id)
    .eq("employee_id", payload.employee_id);

  if (updateInviteError) throw new Error(updateInviteError.message);

  return await revalidatePaths(["/employees"]);
}

export async function resetEmployeePasswordAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const payload = employeePasswordResetSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/employees"]);
  }

  if (!hasSupabaseAdminEnv()) {
    throw new Error("重置员工密码需要配置 SUPABASE_SERVICE_ROLE_KEY。");
  }

  const admin = createAdminClient();
  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, store_id, profile_id, stores!inner(tenant_id)")
    .eq("id", payload.employee_id)
    .maybeSingle();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message ?? "员工不存在");
  }

  const employeeTenantId = (employee.stores as { tenant_id?: string } | null)?.tenant_id;
  if (employeeTenantId !== profile.tenant_id) {
    throw new Error("员工不属于当前租户。");
  }

  if (!employee.profile_id) {
    throw new Error("该员工尚未绑定登录账号");
  }

  const { error } = await admin.auth.admin.updateUserById(employee.profile_id, {
    password: payload.password,
  });

  if (error) throw new Error(error.message);

  return await revalidatePaths(["/employees"]);
}

async function assertStoreInTenant(
  admin: ReturnType<typeof createAdminClient>,
  storeId: string,
  tenantId: string,
) {
  const { data, error } = await admin
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("门店不存在或不属于当前租户。");
}

async function assertEmployeeInTenant(
  admin: ReturnType<typeof createAdminClient>,
  employeeId: string,
  tenantId: string,
) {
  const { data, error } = await admin
    .from("employees")
    .select("id, stores!inner(tenant_id)")
    .eq("id", employeeId)
    .eq("stores.tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("员工不存在或不属于当前租户。");
}
