import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./override.css";
import { Navbar } from "@/components/navbar";
import { Toaster } from "sonner";
import { UserProvider } from "@/contexts/UserContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";

import { ThemeProvider } from "@/components/theme-provider";
import { buildMetadata } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = buildMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AudioPlayerProvider>
            <UserProvider>
              <Navbar />
              {children}
              <Toaster position="bottom-right" richColors />
            </UserProvider>
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
