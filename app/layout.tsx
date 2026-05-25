import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppToaster } from "@/components/toasts/app-toaster";
import { LiveUpdateProvider } from "@/lib/live-updates";
import { PwaInit } from "@/components/pwa/pwa-init";
import { PushRegistration } from "@/components/push/push-registration";
import { StartupSplash } from "@/components/pwa/startup-splash";
import { APP_DESCRIPTION, APP_DISPLAY_NAME } from "@/lib/brand";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#14121c",
};

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_DISPLAY_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_DISPLAY_NAME,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="dark"
      style={{ backgroundColor: "#14121c" }}
    >
      <body
        className={`${geistSans.className} antialiased`}
        style={{ backgroundColor: "#14121c", color: "#f5f3ff" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LiveUpdateProvider>
            <StartupSplash />
            <PwaInit />
            <PushRegistration />
            <AppToaster />
            {children}
          </LiveUpdateProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
