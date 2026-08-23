import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumen — Study Browser",
  description:
    "A lightweight, power-efficient Chromium-based study browser. Your study website is the entire screen. Keyboard-first. No chrome.",
  keywords: [
    "Study Browser",
    "Lumen",
    "Chromium",
    "Electron",
    "Study",
    "Focus",
    "LMS",
  ],
  authors: [{ name: "Lumen" }],
  icons: {
    // Local brand mark. In Electron static export the app loads from file://,
    // so the href must be relative. The flag is baked in at build time.
    icon: process.env.BUILD_ELECTRON === "1" ? "./logo.svg" : "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-hidden`}
      >
        {children}
        <Sonner
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.16 0.006 260 / 0.92)",
              border: "1px solid oklch(1 0 0 / 0.1)",
              color: "oklch(0.96 0.004 260)",
              backdropFilter: "blur(16px)",
            },
          }}
        />
      </body>
    </html>
  );
}
