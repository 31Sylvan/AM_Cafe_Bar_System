"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type CatalogProduct = {
  name: string;
  category: string;
  source_category: string;
  sale_price: number;
  status: string;
  source_channels: string;
};

type PreviewResult = {
  totalRows: number;
  importableCount: number;
  skippedCount: number;
  activeCount: number;
  inactiveCount: number;
  categorySummary: Record<string, number>;
  warnings: string[];
  products: CatalogProduct[];
  skippedProducts: Array<{ name: string; source_category: string; reason: string }>;
  csv: string;
};

type ImportResult = {
  mode?: "demo" | "supabase";
  upsertedCount?: number;
  simulatedCount?: number;
  importableCount?: number;
  skippedCount?: number;
  warnings?: string[];
  error?: string;
};

export function ProductCatalogImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const csvHref = useMemo(() => {
    if (!result?.csv) return null;
    return URL.createObjectURL(new Blob([`\uFEFF${result.csv}`], { type: "text/csv;charset=utf-8" }));
  }, [result]);

  async function submit(endpoint: string) {
    if (!file) return null;
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch(endpoint, { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "商品导入处理失败");
    return payload;
  }

  async function onPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setImportResult(null);

    try {
      setResult(await submit("/api/imports/products/preview"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "商品预览失败");
    } finally {
      setLoading(false);
    }
  }

  async function onImport() {
    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      setImportResult(await submit("/api/imports/products/import"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "商品导入失败");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5">
      <form onSubmit={onPreview} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700" htmlFor="file">商品导出 Excel</label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
            className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <Button disabled={loading || !file}>
          <Upload className="h-4 w-4" />
          {loading ? "解析中" : "生成商品预览"}
        </Button>
      </form>

      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {result ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-5">
            <Metric label="原始行数" value={`${result.totalRows}`} />
            <Metric label="可导入" value={`${result.importableCount}`} />
            <Metric label="跳过" value={`${result.skippedCount}`} />
            <Metric label="上架" value={`${result.activeCount}`} />
            <Metric label="下架" value={`${result.inactiveCount}`} />
          </div>

          <div className="flex flex-wrap gap-2">
            {csvHref ? (
              <Button asChild variant="secondary">
                <a href={csvHref} download="products-normalized.csv">
                  <FileSpreadsheet className="h-4 w-4" />
                  下载标准产品 CSV
                </a>
              </Button>
            ) : null}
            <Button onClick={onImport} disabled={importing || !file}>
              <CheckCircle2 className="h-4 w-4" />
              {importing ? "导入中" : "确认导入产品"}
            </Button>
          </div>

          {importResult ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="font-semibold">{importResult.mode === "demo" ? "Demo 校验完成" : "商品导入完成"}</div>
              <div className="mt-2">写入/更新：{importResult.upsertedCount ?? 0}；模拟：{importResult.simulatedCount ?? 0}；跳过：{importResult.skippedCount ?? 0}</div>
              {importResult.warnings?.length ? <div className="mt-2 text-amber-900">{importResult.warnings[0]}</div> : null}
            </div>
          ) : null}

          {result.warnings.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {result.warnings.map((warning) => <div key={warning}>{warning}</div>)}
            </div>
          ) : null}

          <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="rounded-md border border-stone-200 p-4">
              <h2 className="text-sm font-semibold">原分类分布</h2>
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(result.categorySummary).map(([category, count]) => (
                  <div key={category} className="flex justify-between gap-3">
                    <span className="truncate text-stone-600">{category}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-stone-200">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-stone-100 text-xs font-medium text-stone-500">
                  <tr>
                    <th className="px-4 py-3">商品</th>
                    <th className="px-4 py-3">系统分类</th>
                    <th className="px-4 py-3">原分类</th>
                    <th className="px-4 py-3">售价</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">渠道</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {result.products.slice(0, 80).map((product) => (
                    <tr key={product.name}>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3">{product.category}</td>
                      <td className="px-4 py-3">{product.source_category}</td>
                      <td className="px-4 py-3">¥{product.sale_price.toFixed(2)}</td>
                      <td className="px-4 py-3">{product.status === "active" ? "上架" : "下架"}</td>
                      <td className="px-4 py-3 text-stone-500">{product.source_channels}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {result.skippedProducts.length > 0 ? (
            <div className="rounded-md border border-stone-200 p-4 text-sm">
              <h2 className="font-semibold">跳过清单</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.skippedProducts.slice(0, 40).map((item) => (
                  <span key={`${item.name}-${item.reason}`} className="rounded border border-stone-200 px-2 py-1 text-stone-600">
                    {item.name || "空名称"} / {item.reason}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
