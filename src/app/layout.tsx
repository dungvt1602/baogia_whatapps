import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import RegisterSW from "@/components/common/RegisterSW";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Ago Group — Hệ thống quản lý báo giá nội bộ",
  description: "Quản lý báo giá, template và kênh gửi cho Ago Group",
  manifest: "/manifest.webmanifest",
  applicationName: "Ago Báo giá",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ago Báo giá" },
  icons: { icon: "/logo-agofruit.svg", shortcut: "/logo-agofruit.svg", apple: "/logo-agofruit.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1F7440",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="min-h-full">
        <RegisterSW />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
