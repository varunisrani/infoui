import type { Metadata } from "next";
import { Suspense } from "react";

import { SubscriptionAlert } from "@/features/subscriptions/components/subscription-alert";
import { Modals } from "@/components/modals";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Wrecked Labs",
  description: "Build Something Great!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
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
