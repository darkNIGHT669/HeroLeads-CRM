import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HeroLeads | Intelligent CRM Platform",
  description: "Enterprise-grade lead acquisition, pipeline tracking, and team orchestration for high-velocity sales teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
        <AuthProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500 bg-slate-950/50 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                © {new Date().getFullYear()} HeroLeads CRM. All rights reserved.
              </div>
              <div className="flex items-center gap-1">
                <span>Built for </span>
                <a
                  href="https://digitalheroesco.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Digital Heroes Training Task
                </a>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
