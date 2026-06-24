import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContractLens AI | Understand Before You Sign",
  description: "Understand employment contracts, rental agreements, and terms in plain English. Powered by ASI:ONE.",
  keywords: ["contract analysis", "legal summarizer", "ASI:ONE", "plain English contracts", "AI contract parser"],
  authors: [{ name: "ContractLens Team" }],
};

export const viewport: Viewport = {
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
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50 gradient-bg pb-12">
        {children}
      </body>
    </html>
  );
}
