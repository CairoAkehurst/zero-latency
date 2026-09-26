import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">Account Details</h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm font-medium text-gray-500">Name</div>
                <div className="col-span-2 text-sm text-gray-900">{user.user_metadata?.full_name || "N/A"}</div>
                
                <div className="text-sm font-medium text-gray-500">Email</div>
                <div className="col-span-2 text-sm text-gray-900">{user.email}</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">Mail Synchronization</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your inbox is directly synchronized with Gmail. Labels and actions performed here reflect instantly in your Gmail account.
            </p>
            <button className="px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Re-authenticate Google Account
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
