import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";

export default async function AppearancePage() {
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
          <h1 className="text-2xl font-semibold text-gray-900">Appearance</h1>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">Theme</h2>
            <div className="grid grid-cols-3 gap-4">
              <button className="flex flex-col items-center p-4 border-2 border-blue-500 bg-blue-50 rounded-xl gap-2 transition-all">
                <Sun className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Light</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 hover:border-gray-300 rounded-xl gap-2 transition-all opacity-50 cursor-not-allowed">
                <Moon className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">Dark</span>
                <span className="text-xs text-gray-400 block mt-1">(Coming soon)</span>
              </button>
              <button className="flex flex-col items-center p-4 border border-gray-200 hover:border-gray-300 rounded-xl gap-2 transition-all opacity-50 cursor-not-allowed">
                <Monitor className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">System</span>
                <span className="text-xs text-gray-400 block mt-1">(Coming soon)</span>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">Layout Density</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-blue-200 bg-blue-50 rounded-lg cursor-pointer">
                <input type="radio" name="density" defaultChecked className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Comfortable</div>
                  <div className="text-xs text-gray-500">More space between emails</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 hover:border-gray-300 rounded-lg cursor-pointer opacity-50">
                <input type="radio" name="density" disabled className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Compact (Coming soon)</div>
                  <div className="text-xs text-gray-500">Fit more emails on the screen</div>
                </div>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
