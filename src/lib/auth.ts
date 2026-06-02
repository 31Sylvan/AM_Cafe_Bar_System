import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE, demoProfile, isDemoAuthEnabled } from "@/lib/demo-auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!hasSupabaseEnv()) {
    const cookieStore = await cookies();
    if (isDemoAuthEnabled() && cookieStore.get(DEMO_AUTH_COOKIE)?.value === "owner") {
      return demoProfile;
    }

    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, store_id, role, display_name, phone, status")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

export function requireOwner(profile: Profile) {
  if (profile.role !== "owner") {
    redirect("/dashboard");
  }
}
