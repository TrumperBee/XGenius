import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar, Sidebar } from "@/components/Navbar";
import { LoadingProvider } from "@/components/LoadingContext";
import { InitialLoadingScreen } from "@/components/InitialLoadingScreen";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "XGenius - Autonomous Football Prediction Engine",
  description: "AI-powered football predictions with data-driven insights and verifiable accuracy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[var(--bg-primary)]">
        <LoadingProvider>
          <InitialLoadingScreen />
          <Navbar />
          <Sidebar />
          <main className="pt-16 lg:pl-64">
            <div className="max-w-7xl mx-auto p-4 lg:p-6">
              {children}
            </div>
          </main>
        </LoadingProvider>
      </body>
    </html>
  );
}
