import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AgentMail",
  description: "AI-Native Inbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased h-screen flex overflow-hidden bg-[#f7f7f5]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-white rounded-tl-2xl border-t border-l border-gray-200/50 shadow-sm mt-2">
          {children}
        </main>
      </body>
    </html>
  );
}
