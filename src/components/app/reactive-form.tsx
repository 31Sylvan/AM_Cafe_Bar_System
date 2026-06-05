"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";

type ReactiveFormProps = {
  action: (formData: FormData) => Promise<unknown>;
  children: ReactNode;
  className?: string;
  successText?: string;
  errorText?: string;
  onSuccess?: (formData: FormData) => void;
};

export function ReactiveForm({
  action,
  children,
  className,
  successText = "已保存",
  errorText = "保存失败",
  onSuccess,
}: ReactiveFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setStatus("saving");
    startTransition(async () => {
      try {
        await action(formData);
        onSuccess?.(formData);
        setStatus("saved");
        router.refresh();
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className} data-pending={isPending || status === "saving" ? "true" : "false"}>
      {children}
      <FormStatus status={status} successText={successText} errorText={errorText} />
    </form>
  );
}

function FormStatus({
  status,
  successText,
  errorText,
}: {
  status: "idle" | "saving" | "saved" | "error";
  successText: string;
  errorText: string;
}) {
  if (status === "idle") return null;

  return (
    <div
      aria-live="polite"
      className={`mt-2 text-xs ${status === "error" ? "text-red-600" : status === "saved" ? "text-emerald-700" : "text-stone-500"}`}
    >
      {status === "saving" ? "保存中..." : status === "saved" ? successText : errorText}
    </div>
  );
}
