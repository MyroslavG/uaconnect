import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { ClientErrorReporter } from "@/components/client-error-reporter";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getRequestLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://uaconnect.vercel.app"),
  title: {
    default: "UAConnect | Українські бізнеси в Канаді",
    template: "%s | UAConnect",
  },
  description:
    "Знаходьте українські ресторани, юристів, рієлторів, салони, будівельників, репетиторів, автосервіси та продуктові магазини в Канаді.",
  openGraph: {
    title: "UAConnect",
    description:
      "Гарний і зручний спосіб знайти українські бізнеси в Канаді.",
    url: "https://uaconnect.vercel.app",
    siteName: "UAConnect",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ClientErrorReporter />
          <div className="flex min-h-screen flex-col">
            <SiteHeader locale={locale} />
            <main className="flex-1">{children}</main>
            <SiteFooter locale={locale} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
