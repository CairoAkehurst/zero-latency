import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
