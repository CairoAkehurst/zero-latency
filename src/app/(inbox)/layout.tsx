import { Sidebar } from "@/components/Sidebar";

export default function InboxLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-gray-200/50">
        {children}
      </main>
    </>
  );
}
