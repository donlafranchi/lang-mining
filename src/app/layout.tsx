import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "lang-mining",
  description: "Mine Spanish and Farsi lessons out of anything you read.",
  applicationName: "lang-mining",
  appleWebApp: { capable: true, title: "lang-mining", statusBarStyle: "default" },
  // Stops iOS turning numbers in a lesson into phone links.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f4d3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
