import { Sidebar } from "@/components/Sidebar";

export default function InboxLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#161616] rounded-2xl shadow-sm border border-gray-200/50 my-2 mr-2">
        {children}
      </main>
    </>
  );
}
