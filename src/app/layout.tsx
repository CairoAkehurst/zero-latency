import type { Metadata } from "next";
import "./globals.css";
import { ShortcutHandler } from "@/components/ShortcutHandler";

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
      <body className="antialiased h-[100dvh] flex overflow-hidden bg-[#f7f7f5] p-2 gap-2">
        {children}
        <ShortcutHandler />
      </body>
    </html>
  );
}
