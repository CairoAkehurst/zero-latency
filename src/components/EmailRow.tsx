"use client";

import clsx from "clsx";

interface EmailRowProps {
  email: {
    id: string;
    sender: string;
    summary: string;
    category: string;
    categoryColor: string;
    timestamp: string;
    isUnread: boolean;
  };
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  pink: "bg-pink-100 text-pink-700",
  purple: "bg-purple-100 text-purple-700",
  red: "bg-red-100 text-red-700",
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
};

export function EmailRow({ email }: EmailRowProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors group">
      {/* Unread Indicator */}
      <div className="w-2 flex-shrink-0 flex justify-center">
        {email.isUnread && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Sender */}
      <div className={clsx(
        "w-32 flex-shrink-0 text-sm truncate",
        email.isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-600"
      )}>
        {email.sender}
      </div>

      {/* Summary */}
      <div className={clsx(
        "flex-1 text-sm truncate",
        email.isUnread ? "font-medium text-gray-800" : "text-gray-500"
      )}>
        {email.summary}
      </div>

      {/* Category Badge */}
      <div className="flex-shrink-0">
        <span className={clsx(
          "px-2.5 py-0.5 rounded-full text-xs font-medium",
          colorMap[email.categoryColor] || "bg-gray-100 text-gray-700"
        )}>
          {email.category}
        </span>
      </div>

      {/* Timestamp */}
      <div className={clsx(
        "w-20 text-right text-xs flex-shrink-0",
        email.isUnread ? "font-medium text-gray-900" : "text-gray-400"
      )}>
        {email.timestamp}
      </div>
    </div>
  );
}
