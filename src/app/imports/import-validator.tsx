"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type Result = {
  rowCount: number;
  validRows: number;
  errors: string[];
  warnings: string[];
  headers: string[];
};

export function ImportValidator() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await fetch("/api/imports/validate", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "预检失败");
      return;
    }

    setResult(payload);
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5">
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700" htmlFor="template">模板类型</label>
          <Select id="template" name="template" defaultValue="inventory-items">
            <option value="inventory-items">原料</option>
            <option value="inventory-import">库存导入</option>
            <option value="products">产品</option>
            <option value="recipes">配方</option>
            <option value="employees">员工</option>
            <option value="purchases">采购明细</option>
            <option value="sales-batch">销售批量</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700" htmlFor="file">CSV 文件</label>
          <input id="file" name="file" type="file" accept=".csv,text/csv" required className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm" />
        </div>
        <Button disabled={loading}>
          <Upload className="h-4 w-4" />
          {loading ? "预检中" : "开始预检"}
        </Button>
      </form>

      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {result ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="数据行" value={`${result.rowCount}`} />
            <Metric label="有效行" value={`${result.validRows}`} />
            <Metric label="问题数" value={`${result.errors.length}`} />
          </div>
          {result.errors.length > 0 ? (
            <Panel title="错误" tone="red" items={result.errors} />
          ) : (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">预检通过，可以进入人工复核和正式导入流程。</div>
          )}
          {result.warnings.length > 0 ? <Panel title="提醒" tone="amber" items={result.warnings} /> : null}
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

function Panel({ title, tone, items }: { title: string; tone: "red" | "amber"; items: string[] }) {
  const className = tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-md border p-3 text-sm ${className}`}>
      <div className="font-semibold">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
