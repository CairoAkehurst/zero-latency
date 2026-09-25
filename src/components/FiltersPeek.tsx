import { X, Filter, SortAsc, Eye, CheckSquare } from "lucide-react";

interface FiltersPeekProps {
  onClose: () => void;
}

export function FiltersPeek({ onClose }: FiltersPeekProps) {
  return (
    <div className="flex flex-col h-full bg-white z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-1 border-l border-gray-100 rounded-tl-2xl">
      <div className="h-[68px] px-5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <h2 className="font-semibold text-gray-900">View Options</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            Quick Filters
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-4 h-4" />
              <span className="text-sm text-gray-700">Unread emails only</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-4 h-4" />
              <span className="text-sm text-gray-700">Has attachments</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-4 h-4" />
              <span className="text-sm text-gray-700">From contacts only</span>
            </label>
          </div>
        </section>

        <hr className="border-gray-100" />

        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-gray-500" />
            Sort By
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between w-full p-3 border border-blue-500 bg-blue-50/50 rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-blue-900">Newest first</span>
              <input type="radio" name="sort" defaultChecked className="text-blue-600 focus:ring-blue-500 border-gray-300" />
            </label>
            <label className="flex items-center justify-between w-full p-3 border border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-gray-700">Oldest first</span>
              <input type="radio" name="sort" className="text-blue-600 focus:ring-blue-500 border-gray-300" />
            </label>
            <label className="flex items-center justify-between w-full p-3 border border-gray-200 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-gray-700">Sender (A-Z)</span>
              <input type="radio" name="sort" className="text-blue-600 focus:ring-blue-500 border-gray-300" />
            </label>
          </div>
        </section>

        <hr className="border-gray-100" />

        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-500" />
            Display Density
          </h3>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button className="flex-1 py-1.5 text-sm font-medium bg-white shadow-sm rounded-md text-gray-900">
              Comfortable
            </button>
            <button className="flex-1 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
              Compact
            </button>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-gray-100 flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
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
