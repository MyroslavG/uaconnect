"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

type NextThemesProviderWithChildren = React.ComponentType<
  ThemeProviderProps & { children?: React.ReactNode }
>;

const Provider = NextThemesProvider as NextThemesProviderWithChildren;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </Provider>
  );
}
