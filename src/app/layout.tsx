import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/AppHeader";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { startupImages } from "@/lib/splash";
import { themeScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hand to Brain",
  description: "Learn Spanish and Farsi from anything you read.",
  applicationName: "Hand to Brain",
  appleWebApp: { capable: true, title: "Hand to Brain", statusBarStyle: "default", startupImage: startupImages() },
  // Stops iOS turning numbers in a lesson into phone links.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#576668",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
      </head>
      <body>
        <AppHeader />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
