"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidateAndReturn } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { dashboardWidgetDefinitions, defaultInterfaceContent, navigationDefinitions } from "@/lib/interface-config";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const storeSchema = z.object({
  name: z.string().trim().min(1),
  business_mode: z.string().trim().min(1),
  address: z.string().trim().optional(),
  timezone: z.string().trim().min(1),
});

export async function updateStoreSettingsAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");
  const payload = storeSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    await revalidateAndReturn(["/settings"], "/settings");
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

  await revalidateAndReturn(["/settings"], "/settings");
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
    await revalidateAndReturn(["/settings"], "/settings");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_store_for_current_tenant", {
    p_name: payload.name,
    p_business_mode: payload.business_mode,
    p_address: payload.address || null,
    p_timezone: payload.timezone,
  });

  if (error) throw new Error(error.message);

  await revalidateAndReturn(["/settings"], "/settings");
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

  await revalidateAndReturn(["/", "/settings/interface"], "/settings/interface");
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

  await revalidateAndReturn(["/dashboard", "/settings/interface"], "/settings/interface");
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

  await revalidateAndReturn(["/", "/dashboard", "/settings/interface"], "/settings/interface");
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

  await revalidateAndReturn(["/", "/dashboard", "/settings/interface"], "/settings/interface");
}
