import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { validateEnvironment } from "@/lib/validateEnv";

// Validate environment variables at startup
if (typeof window === 'undefined') {
  validateEnvironment();
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rush University HR Assistant",
  description: "AI-powered resume evaluation system for Rush University System for Health",
  keywords: ["HR", "Resume", "AI", "Evaluation", "Rush University"],
  authors: [{ name: "Rush University System for Health" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
