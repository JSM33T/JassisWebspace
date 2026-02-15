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
import { BackToTopProgress } from "@/components/back-to-top-progress";
import { RouteProgressBar } from "@/components/route-progress-bar";

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
          {/* <head>
        <script
          async
          crossOrigin="anonymous"
          src="https://tweakcn.com/live-preview.min.js"
        />
      </head> */}
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AudioPlayerProvider>
            <UserProvider>
              <RouteProgressBar />
              <Navbar />
              {children}
              <BackToTopProgress />
              <Toaster position="bottom-right" richColors />
            </UserProvider>
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
