import { ClerkProvider } from "@clerk/nextjs";
import TanStackQueryProvider from "@/provider/TanstackProvider";
import { ThemeProvider } from "@/provider/theme-provider";
import { TipProvider } from "@/components/onboarding/TipProvider";
import { GlobalGenerationManagers } from "@/components/notebook/GlobalGenerationManagers";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import "@/styles/globals.css";
import { type Metadata } from "next";
import { Inter } from "next/font/google";

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Presentations",
  description: "AI-powered smart presentation creation. Generate, edit, and present beautiful AI-powered slides in seconds.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <TanStackQueryProvider>
        <ThemeProvider>
          <TipProvider>
            <AppErrorBoundary>
              <html lang="en" suppressHydrationWarning>
                <body className={`${inter.className} antialiased`}>
                  {children}
                  <GlobalGenerationManagers />
                </body>
              </html>
            </AppErrorBoundary>
          </TipProvider>
        </ThemeProvider>
      </TanStackQueryProvider>
    </ClerkProvider>
  );
}
