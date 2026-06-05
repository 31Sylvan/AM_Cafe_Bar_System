import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoStore } from "@/lib/demo-auth";
import type { Store, StoreMembership } from "@/lib/types";

export async function getCurrentStore() {
  if (!hasSupabaseEnv()) return demoStore;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("未登录，无法获取当前门店。");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("id", user.id)
    .single();

  if (profileError) throw new Error(profileError.message);

  const { data, error } = await supabase.from("stores").select("*").eq("id", profile.store_id).single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    tenant_id: data.tenant_id ?? data.id,
  } as Store;
}

export async function getAvailableStores() {
  if (!hasSupabaseEnv()) {
    return [
      {
        id: "demo-membership",
        tenant_id: demoStore.tenant_id,
        store_id: demoStore.id,
        profile_id: "demo-profile",
        role: "owner",
        status: "active",
        created_at: new Date(0).toISOString(),
        stores: demoStore,
      },
    ] satisfies StoreMembership[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_memberships")
    .select("*, stores(*)")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    const currentStore = await getCurrentStore();
    return [
      {
        id: "legacy-current-store",
        tenant_id: currentStore.tenant_id,
        store_id: currentStore.id,
        profile_id: "legacy-profile",
        role: "owner",
        status: "active",
        created_at: currentStore.created_at,
        stores: currentStore,
      },
    ] satisfies StoreMembership[];
  }

  return (data as StoreMembership[]).filter((membership) => membership.stores?.status === "active");
}
