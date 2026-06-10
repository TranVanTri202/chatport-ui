import type { Metadata } from "next";
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from "next/font/google";
import { AppProvider } from "@/providers/AppProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { AppShell } from "@/components/common/AppShell";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ZaloHub — Multi-account Manager",
  description: "Trung tâm điều phối nhiều tài khoản Zalo với trợ lý AI.",
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }): JSX.Element {
  return (
    <html lang="vi" className={`${display.variable} ${sans.variable}`}>
      <body>
        <AppProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
