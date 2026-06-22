"use client";

import { useEffect } from "react";

type ClientErrorPayload = {
  componentStack?: string;
  digest?: string;
  message: string;
  path: string;
  source: string;
  stack?: string;
};

export function ClientErrorReporter() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      reportClientError({
        message: event.message || "Unhandled browser error",
        path: window.location.href,
        source: "window.error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;

      reportClientError({
        message:
          reason instanceof Error
            ? reason.message
            : String(reason ?? "Unhandled promise rejection"),
        path: window.location.href,
        source: "unhandledrejection",
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

export function reportClientError(payload: ClientErrorPayload) {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    const queued = navigator.sendBeacon("/api/client-error", blob);

    if (queued) {
      return;
    }
  }

  void fetch("/api/client-error", {
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
    method: "POST",
  });
}
