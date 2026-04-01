import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./override.css";
import { Toaster } from "sonner";
import { UserProvider } from "@/contexts/UserContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";

import { ThemeProvider } from "@/components/theme-provider";
import { buildMetadata } from "@/lib/seo";
import { BackToTopProgress } from "@/components/back-to-top-progress";
import { AppShell } from "@/components/app-shell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = buildMetadata();

const toasterClassNames = {
  toast:
    "group relative overflow-hidden rounded-2xl border border-primary/25 bg-background/60 text-foreground shadow-xl shadow-black/10 backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-white/15 supports-[backdrop-filter]:bg-background/50",
  title: "text-sm font-semibold tracking-tight text-foreground",
  description: "text-xs text-foreground/70",
  success: "!bg-background/60 !text-foreground !border-primary/25",
  error: "!bg-background/60 !text-foreground !border-primary/25",
  info: "!bg-background/60 !text-foreground !border-primary/25",
  warning: "!bg-background/60 !text-foreground !border-primary/25",
  loading: "!bg-background/60 !text-foreground !border-primary/25",
  default: "!bg-background/60 !text-foreground !border-primary/25",
  actionButton:
    "!rounded-full !border !border-primary/35 !bg-background/75 !text-foreground !font-medium hover:!bg-background/95",
  cancelButton:
    "!rounded-full !border !border-border/70 !bg-background/75 !text-foreground/80 hover:!bg-background/95",
  closeButton:
    "!border !border-primary/25 !bg-background/80 !text-foreground/60 hover:!bg-background/95 hover:!text-foreground",
};

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
              <AppShell>{children}</AppShell>
              <BackToTopProgress />
              <Toaster
                position="bottom-center"
                expand
                toastOptions={{ classNames: toasterClassNames }}
              />
            </UserProvider>
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
