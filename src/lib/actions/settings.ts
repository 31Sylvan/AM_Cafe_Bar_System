"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePaths } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { dashboardWidgetDefinitions, defaultInterfaceContent, navigationDefinitions } from "@/lib/interface-config";
import { createAdminClient, createClient, hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/server";

const storeSchema = z.object({
  name: z.string().trim().min(1),
  business_mode: z.string().trim().min(1),
  address: z.string().trim().optional(),
  timezone: z.string().trim().min(1),
});

const archiveStoreSchema = z.object({
  store_id: z.string().uuid(),
  confirm_name: z.string().trim().min(1),
});

export async function updateStoreSettingsAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");
  const payload = storeSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/settings"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      name: payload.name,
      business_mode: payload.business_mode,
      address: payload.address || null,
      timezone: payload.timezone,
    })
    .eq("id", profile.store_id);

  if (error) throw new Error(error.message);

  return await revalidatePaths(["/settings"]);
}

export async function switchCurrentStoreAction(formData: FormData) {
  await requireProfile();
  const storeId = z.string().uuid().parse(formData.get("store_id"));

  if (!hasSupabaseEnv()) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("switch_current_store", {
    p_store_id: storeId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function createStoreAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");
  const payload = storeSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/settings"]);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_store_for_current_tenant", {
    p_name: payload.name,
    p_business_mode: payload.business_mode,
    p_address: payload.address || null,
    p_timezone: payload.timezone,
  });

  if (error) throw new Error(error.message);

  return await revalidatePaths(["/settings"]);
}

export async function archiveStoreAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");
  const payload = archiveStoreSchema.parse(Object.fromEntries(formData));

  if (payload.store_id === profile.store_id) {
    throw new Error("不能删除当前正在使用的门店，请先切换到其他门店。");
  }

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/settings"]);
  }

  if (!hasSupabaseAdminEnv()) {
    throw new Error("删除门店需要配置 SUPABASE_SERVICE_ROLE_KEY。");
  }

  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id, tenant_id, name, status")
    .eq("id", payload.store_id)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (storeError) throw new Error(storeError.message);
  if (!store) throw new Error("门店不存在或不属于当前租户。");
  if (store.status !== "active") throw new Error("门店已经停用。");
  if (payload.confirm_name !== store.name) throw new Error("门店名称确认不一致。");

  const { count, error: countError } = await admin
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id)
    .eq("status", "active");

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) <= 1) {
    throw new Error("当前租户至少需要保留一家启用门店。");
  }

  const now = new Date().toISOString();
  const [storeResult, membershipResult] = await Promise.all([
    admin.from("stores").update({ status: "disabled" }).eq("id", payload.store_id).eq("tenant_id", profile.tenant_id),
    admin
      .from("store_memberships")
      .update({ status: "disabled" })
      .eq("tenant_id", profile.tenant_id)
      .eq("store_id", payload.store_id),
  ]);

  if (storeResult.error) throw new Error(storeResult.error.message);
  if (membershipResult.error) throw new Error(membershipResult.error.message);

  const { error: entitlementError } = await admin
    .from("store_module_entitlements")
    .update({ enabled: false, note: `门店已停用 ${now}`, updated_by: profile.id, updated_at: now })
    .eq("store_id", payload.store_id);

  if (entitlementError && !entitlementError.message.includes("does not exist")) {
    throw new Error(entitlementError.message);
  }

  return await revalidatePaths(["/", "/settings", "/platform"]);
}

export async function updateNavigationSettingsAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");

  const keys = formData.getAll("item_key").map(String);
  const labelByKey = new Map(formData.getAll("nav_label").map((value, index) => [keys[index], String(value).trim()]));
  const hiddenKeys = new Set(formData.getAll("nav_hidden").map(String));
  const positionByKey = new Map(formData.getAll("nav_position").map((value, index) => [keys[index], Number(value)]));
  const allowedKeys = new Set(navigationDefinitions.map((item) => item.key));

  const rows = keys
    .filter((key) => allowedKeys.has(key as never))
    .map((key, index) => {
      const definition = navigationDefinitions.find((item) => item.key === key);
      return {
        store_id: profile.store_id,
        item_key: key,
        label: labelByKey.get(key) || definition?.defaultLabel || key,
        position: Number.isFinite(positionByKey.get(key)) ? Number(positionByKey.get(key)) : (index + 1) * 10,
        hidden: hiddenKeys.has(key),
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      };
    });

  if (hasSupabaseEnv() && rows.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase.from("store_navigation_settings").upsert(rows, { onConflict: "store_id,item_key" });
    if (error) throw new Error(error.message);
  }

  return await revalidatePaths(["/", "/settings/interface"]);
}

export async function updateDashboardWidgetSettingsAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");

  const keys = formData.getAll("widget_key").map(String);
  const titleByKey = new Map(formData.getAll("widget_title").map((value, index) => [keys[index], String(value).trim()]));
  const hiddenKeys = new Set(formData.getAll("widget_hidden").map(String));
  const positionByKey = new Map(formData.getAll("widget_position").map((value, index) => [keys[index], Number(value)]));
  const allowedKeys = new Set(dashboardWidgetDefinitions.map((item) => item.key));

  const rows = keys
    .filter((key) => allowedKeys.has(key as never))
    .map((key, index) => {
      const definition = dashboardWidgetDefinitions.find((item) => item.key === key);
      return {
        store_id: profile.store_id,
        widget_key: key,
        title: titleByKey.get(key) || definition?.defaultTitle || key,
        position: Number.isFinite(positionByKey.get(key)) ? Number(positionByKey.get(key)) : (index + 1) * 10,
        hidden: hiddenKeys.has(key),
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      };
    });

  if (hasSupabaseEnv() && rows.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase.from("store_dashboard_widgets").upsert(rows, { onConflict: "store_id,widget_key" });
    if (error) throw new Error(error.message);
  }

  return await revalidatePaths(["/dashboard", "/settings/interface"]);
}

export async function updateInterfaceContentAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");

  const contentKeys = Object.keys(defaultInterfaceContent) as Array<keyof typeof defaultInterfaceContent>;
  const rows = contentKeys.map((key) => ({
    store_id: profile.store_id,
    content_key: key,
    value: String(formData.get(key) ?? defaultInterfaceContent[key]).trim() || defaultInterfaceContent[key],
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }));

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { error } = await supabase.from("store_content_overrides").upsert(rows, { onConflict: "store_id,content_key" });
    if (error) throw new Error(error.message);
  }

  return await revalidatePaths(["/", "/dashboard", "/settings/interface"]);
}

export async function resetInterfaceSettingsAction() {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const [navigation, dashboard, content] = await Promise.all([
      supabase.from("store_navigation_settings").delete().eq("store_id", profile.store_id),
      supabase.from("store_dashboard_widgets").delete().eq("store_id", profile.store_id),
      supabase.from("store_content_overrides").delete().eq("store_id", profile.store_id),
    ]);

    const error = navigation.error ?? dashboard.error ?? content.error;
    if (error) throw new Error(error.message);
  }

  return await revalidatePaths(["/", "/dashboard", "/settings/interface"]);
}
