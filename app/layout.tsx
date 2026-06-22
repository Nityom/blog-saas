import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import ConvexClientProvider from "./ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "BlogForge",
  description: "AI-powered platform to create, manage, and scale blogs effortlessly.",
  // Explicitly declare the root favicon so Next.js does NOT inject its own
  // uncontrolled <link rel="icon" href="/favicon.ico" type="image/x-icon"
  // sizes="16x16"> default. Page-level icons will override this per-clinic.
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={`antialiased`}
      >
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
