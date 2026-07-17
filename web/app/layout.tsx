import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { ClientErrorReporter } from "@/components/client-error-reporter";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getRequestLocale } from "@/lib/locale";
import { Analytics } from "@vercel/analytics/next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://uaconnect.vercel.app"),
  title: {
    default: "Kolo | Українські бізнеси в Канаді",
    template: "%s | Kolo",
  },
  description:
    "Знаходьте українські ресторани, юристів, рієлторів, салони, будівельників, репетиторів, автосервіси та продуктові магазини в Канаді.",
  openGraph: {
    title: "Kolo",
    description:
      "Гарний і зручний спосіб знайти українські бізнеси в Канаді.",
    url: "https://uaconnect.vercel.app",
    siteName: "Kolo",
    type: "website",
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/kolo-logo.png", type: "image/png" }],
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
        <Analytics />
      </body>
    </html>
  );
}
