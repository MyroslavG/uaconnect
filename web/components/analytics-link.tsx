"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import {
  trackContactClick,
  type ContactAnalyticsTarget,
} from "@/lib/analytics";

type AnalyticsLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  analytics: ContactAnalyticsTarget;
  children: ReactNode;
};

export function AnalyticsLink({
  analytics,
  children,
  onClick,
  ...props
}: AnalyticsLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackContactClick(analytics);
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
