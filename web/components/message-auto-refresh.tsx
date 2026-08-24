"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type MessageAutoRefreshProps = {
  intervalMs?: number;
};

export function MessageAutoRefresh({
  intervalMs = 5000,
}: MessageAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, router]);

  return null;
}
