"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE, getDemoCredentials, isDemoAuthEnabled } from "@/lib/demo-auth";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!hasSupabaseEnv()) {
    const demo = getDemoCredentials();

    if (isDemoAuthEnabled() && email === demo.email && password === demo.password) {
      const cookieStore = await cookies();
      cookieStore.set(DEMO_AUTH_COOKIE, "owner", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      redirect("/dashboard");
    }

    redirect(`/login?error=${encodeURIComponent("本地演示账号或密码不正确")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_AUTH_COOKIE);
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
