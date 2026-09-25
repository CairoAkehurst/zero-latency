import { Sidebar } from "@/components/Sidebar";

export default function InboxLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white rounded-tl-2xl border-t border-l border-gray-200/50 shadow-sm mt-2">
        {children}
      </main>
    </>
  );
}
