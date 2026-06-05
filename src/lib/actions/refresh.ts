"use server";

import { revalidatePath } from "next/cache";

export async function revalidatePaths(paths: string[]): Promise<void> {
  for (const path of paths) {
    if (path === "/") {
      revalidatePath(path, "layout");
    } else {
      revalidatePath(path);
    }
  }
}
