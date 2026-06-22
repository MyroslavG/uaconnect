"use client";

import { useEffect } from "react";

import { reportClientError } from "@/components/client-error-reporter";

export default function GlobalError({
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
      source: "react.global_error_boundary",
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="uk">
      <body>
        <main
          style={{
            display: "grid",
            minHeight: "100vh",
            padding: "24px",
            placeItems: "center",
          }}
        >
          <section
            style={{
              border: "1px solid #d7dfdc",
              borderRadius: "8px",
              fontFamily: "system-ui, sans-serif",
              maxWidth: "520px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#2d6f62", fontWeight: 700 }}>
              Something went wrong
            </p>
            <h1>Please try again</h1>
            <p>The error was logged for review.</p>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#2d6f62",
                border: 0,
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
                padding: "12px 16px",
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
