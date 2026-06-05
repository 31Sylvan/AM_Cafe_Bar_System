"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function revalidateAndReturn(paths: string[], fallbackPath: string) {
  for (const path of paths) {
    if (path === "/") {
      revalidatePath(path, "layout");
    } else {
      revalidatePath(path);
    }
  }

  const headerStore = await headers();
  const referer = headerStore.get("referer");
  if (!referer) {
    redirect(fallbackPath);
  }

  let returnPath = fallbackPath;
  try {
    const url = new URL(referer);
    returnPath = `${url.pathname}${url.search}`;
  } catch {
    returnPath = fallbackPath;
  }

  redirect(returnPath);
}
