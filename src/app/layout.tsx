import type { Metadata } from "next";
import { Suspense } from "react";

import { SubscriptionAlert } from "@/features/subscriptions/components/subscription-alert";
import { Modals } from "@/components/modals";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { SkipLinks } from "@/components/skip-links";

import "./globals.css";

export const metadata: Metadata = {
  title: "Wrecked Labs",
  description: "Build Something Great!",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <SkipLinks />
        <div id="status-announcements" aria-live="polite" aria-atomic="true" className="sr-only"></div>
        <div id="alert-announcements" aria-live="assertive" aria-atomic="true" className="sr-only"></div>
        <Suspense>
          <Providers>
            <Modals />
            <Toaster />
            <SubscriptionAlert />
            {children}
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
