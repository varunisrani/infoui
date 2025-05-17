import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";

import { SubscriptionAlert } from "@/features/subscriptions/components/subscription-alert";
import { Modals } from "@/components/modals";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
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
