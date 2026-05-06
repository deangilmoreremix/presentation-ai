import "@/styles/globals.css";
import { ThemeProvider } from "@/provider/theme-provider";
import TanStackQueryProvider from "@/provider/TanstackProvider";
import { type Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Presentation AI",
  description: "AI-powered presentation creation and editing.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <TanStackQueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </TanStackQueryProvider>
      </body>
    </html>
  );
}