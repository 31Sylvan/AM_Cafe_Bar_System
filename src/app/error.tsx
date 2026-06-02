"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-md border border-stone-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" />
        <h1 className="mt-4 text-lg font-semibold text-stone-950">操作没有完成</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          {error.message || "系统遇到一个未预期的问题，请重试。"}
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          重试
        </Button>
      </div>
    </main>
  );
}
