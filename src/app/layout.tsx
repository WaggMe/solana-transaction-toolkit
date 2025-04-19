// Removed 'use client' - This is now a Server Component
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from 'react';
import { ClientWalletProviders } from "@/components/ClientWalletProviders"; // Import the new provider wrapper
import Footer from "@/components/Footer"; // Import the Footer

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Now we can properly export metadata from this Server Component
export const metadata: Metadata = {
  title: "Solana Transaction Toolkit",
  description: "Create, inspect, and execute Solana transactions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Wallet adapter logic is moved to ClientWalletProviders

  return (
    <html lang="en">
      {/* <head> content is automatically managed by Next.js via metadata export */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}> {/* Wrap providers */}
          {/* Wrap children with the client-side providers */}
          <ClientWalletProviders>
            {/* Main content pushes footer down */}
            <div className="flex-grow">
              {children}
            </div>
            <Footer />
          </ClientWalletProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
