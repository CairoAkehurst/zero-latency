import { X, Filter, SortAsc, Eye, CheckSquare } from "lucide-react";

interface FiltersPeekProps {
  onClose: () => void;
}

export function FiltersPeek({ onClose }: FiltersPeekProps) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#161616] z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 border-l border-gray-100 dark:border-white/5 rounded-tl-2xl">
      <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 flex-shrink-0">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">View Options</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-full transition-colors text-gray-500 dark:text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            Quick Filters
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20 w-4 h-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Unread emails only</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20 w-4 h-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Has attachments</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20 w-4 h-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300">From contacts only</span>
            </label>
          </div>
        </section>

        <hr className="border-gray-100 dark:border-white/5" />

        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            Sort By
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between w-full p-3 border border-blue-500 bg-blue-50/50 rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-blue-900">Newest first</span>
              <input type="radio" name="sort" defaultChecked className="text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20" />
            </label>
            <label className="flex items-center justify-between w-full p-3 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1c1c1c] dark:bg-[#1c1c1c] rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Oldest first</span>
              <input type="radio" name="sort" className="text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20" />
            </label>
            <label className="flex items-center justify-between w-full p-3 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#1c1c1c] dark:bg-[#1c1c1c] rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sender (A-Z)</span>
              <input type="radio" name="sort" className="text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20" />
            </label>
          </div>
        </section>

        <hr className="border-gray-100 dark:border-white/5" />

        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            Display Density
          </h3>
          <div className="flex bg-gray-100 dark:bg-[#202020] p-1 rounded-lg">
            <button className="flex-1 py-1.5 text-sm font-medium bg-white dark:bg-[#161616] shadow-sm rounded-md text-gray-900 dark:text-gray-100">
              Comfortable
            </button>
            <button className="flex-1 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300">
              Compact
            </button>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-2 bg-gray-100 dark:bg-[#202020] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#262626] dark:bg-[#262626] transition-colors"
        >
          Reset
        </button>
        <button 
          onClick={onClose}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
