"use client";

import { X, Reply, Calendar, Check, Send } from "lucide-react";

interface EmailDetailPeekProps {
  email: {
    id: string;
    sender: string;
    summary: string;
    category: string;
    categoryColor: string;
    timestamp: string;
    isUnread: boolean;
  } | null;
  onClose: () => void;
}

export function EmailDetailPeek({ email, onClose }: EmailDetailPeekProps) {
  if (!email) return null;

  return (
    <div className="w-[450px] border-l border-gray-100 bg-white flex flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 truncate pr-4">{email.sender}</h2>
        <button 
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* AI Summary Card */}
        <div className="bg-[#f7f7f5] rounded-xl p-4 border border-gray-200/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Summary</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {email.summary}
          </p>
        </div>

        {/* Suggested Actions */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Actions</div>
          
          <button className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                <Reply className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Draft Reply</div>
                <div className="text-xs text-gray-500">&quot;Sounds great, let&apos;s meet then.&quot;</div>
              </div>
            </div>
            <Send className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
          </button>

          <button className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all group text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Book Meeting</div>
                <div className="text-xs text-gray-500">Schedule for tomorrow afternoon</div>
              </div>
            </div>
            <Check className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
          </button>
        </div>

        {/* Original Thread (Mock) */}
        <div className="pt-4 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Original Message</div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{email.sender}</span>
                  <span className="text-xs text-gray-400">{email.timestamp}</span>
                </div>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>Hi there,</p>
                  <p>Could we review this together? The latest updates are attached.</p>
                  <p>Thanks,<br/>{email.sender.split(' ')[0]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
