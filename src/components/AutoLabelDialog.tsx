"use client";

import { useState } from "react";
import { X, Sparkles, Loader2, Tag } from "lucide-react";

interface AutoLabelDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AutoLabelDialog({ onClose, onSuccess }: AutoLabelDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("Please enter a label name.");
      return;
    }
    
    setIsBusy(true);
    try {
      const res = await fetch('/api/mail/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), instruction: description.trim() })
      });
      
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        alert("Failed to create label: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error creating label.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#161616] rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Auto-label rule
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#202020] dark:bg-[#202020] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Label name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Invoices"
              className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
              autoFocus
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">When to apply (optional)</label>
              <span className="text-xs text-gray-400 font-normal">Auto-apply rule</span>
            </div>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Emails from Stripe or containing receipts"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm resize-none"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              AI will automatically categorize incoming emails and past emails matching this description.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-[#1c1c1c] border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={isBusy}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            {isBusy ? "Saving..." : description.trim() ? "Create & auto-label" : "Create label"}
          </button>
        </div>

      </div>
    </div>
  );
}
