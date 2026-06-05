import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { ImportBatch, ImportBatchIssue, Profile } from "@/lib/types";

type ImportBatchPayload = Pick<
  ImportBatch,
  "import_type" | "source_file" | "status" | "total_rows" | "imported_rows" | "skipped_rows" | "warning_count"
> & {
  error_message?: string | null;
};

export type ImportBatchIssuePayload = Pick<ImportBatchIssue, "severity" | "issue_type" | "entity_name" | "message"> & {
  row_no?: number | null;
  payload?: Record<string, unknown>;
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

export async function getImportBatch(importBatchId: string) {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .eq("id", importBatchId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ImportBatch | null;
}

export async function listImportBatchIssues(importBatchId: string) {
  if (!hasSupabaseEnv()) return [] satisfies ImportBatchIssue[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batch_issues")
    .select("*")
    .eq("import_batch_id", importBatchId)
    .order("severity", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingImportIssuesTable(error)) return [] satisfies ImportBatchIssue[];
    throw new Error(error.message);
  }

  return (data ?? []) as ImportBatchIssue[];
}

export async function recordImportBatch(
  profile: Profile,
  payload: ImportBatchPayload,
) {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .insert({
      tenant_id: profile.tenant_id,
      store_id: profile.store_id,
      created_by: profile.id,
      ...payload,
      error_message: payload.error_message ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ImportBatch;
}

export async function recordFailedImportBatch(
  profile: Profile,
  payload: Omit<ImportBatchPayload, "status" | "imported_rows"> & { imported_rows?: number },
) {
  return await recordImportBatch(profile, {
    status: "failed",
    imported_rows: payload.imported_rows ?? 0,
    ...payload,
  });
}

export async function recordImportBatchIssues(
  profile: Profile,
  importBatchId: string | undefined,
  issues: ImportBatchIssuePayload[],
) {
  if (!hasSupabaseEnv() || !importBatchId || issues.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from("import_batch_issues").insert(
    issues.map((issue) => ({
      tenant_id: profile.tenant_id,
      store_id: profile.store_id,
      import_batch_id: importBatchId,
      severity: issue.severity,
      issue_type: issue.issue_type,
      entity_name: issue.entity_name,
      message: issue.message,
      row_no: issue.row_no ?? null,
      payload: issue.payload ?? {},
    })),
  );

  if (error && !isMissingImportIssuesTable(error)) {
    throw new Error(error.message);
  }
}

function isMissingImportIssuesTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("import_batch_issues") && error.message?.match(/not exist|schema cache|relation/i))
  );
}
