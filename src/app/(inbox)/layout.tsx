import { Sidebar } from "@/components/Sidebar";

export default function InboxLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#191919] rounded-2xl shadow-sm border border-gray-200/50 dark:border-transparent my-2 mr-2">
        {children}
      </main>
    </>
  );
}
