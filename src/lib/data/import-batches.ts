import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { ImportBatch, Profile } from "@/lib/types";

type ImportBatchPayload = Pick<
  ImportBatch,
  "import_type" | "source_file" | "status" | "total_rows" | "imported_rows" | "skipped_rows" | "warning_count"
> & {
  error_message?: string | null;
};

export async function listImportBatches() {
  if (!hasSupabaseEnv()) return [] satisfies ImportBatch[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw new Error(error.message);
  return data as ImportBatch[];
}

export async function recordImportBatch(
  profile: Profile,
  payload: ImportBatchPayload,
) {
  if (!hasSupabaseEnv()) return;

  const supabase = await createClient();
  await supabase.from("import_batches").insert({
    tenant_id: profile.tenant_id,
    store_id: profile.store_id,
    created_by: profile.id,
    ...payload,
    error_message: payload.error_message ?? null,
  });
}

export async function recordFailedImportBatch(
  profile: Profile,
  payload: Omit<ImportBatchPayload, "status" | "imported_rows"> & { imported_rows?: number },
) {
  await recordImportBatch(profile, {
    status: "failed",
    imported_rows: payload.imported_rows ?? 0,
    ...payload,
  });
}
