"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { reportClientError } from "@/components/client-error-reporter";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      digest: error.digest,
      message: error.message,
      path: window.location.href,
      source: "react.error_boundary",
      stack: error.stack,
    });
  }, [error]);

  return (
    <section className="container grid min-h-[60vh] place-items-center py-12">
      <div className="max-w-lg rounded-lg border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-bold uppercase text-primary">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-black">Please try again</h1>
        <p className="mt-3 text-muted-foreground">
          We logged the error details so it can be investigated.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </section>
  );
}
