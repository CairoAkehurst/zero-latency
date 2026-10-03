import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center bg-white dark:bg-[#161616] text-gray-400 dark:text-gray-500">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
      <p className="text-sm font-medium animate-pulse">Loading...</p>
    </div>
  );
}
