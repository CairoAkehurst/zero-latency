"use client";

import clsx from "clsx";

interface EmailRowProps {
  email: {
    id: string;
    sender_name: string;
    sender_email: string;
    subject: string;
    summary: string;
    category: string;
    categoryColor: string;
    hasAiMetadata?: boolean;
    timestamp: string;
    is_unread: boolean;
  };
  isSelected?: boolean;
  isCompressed?: boolean;
  isChecked?: boolean;
  onToggleCheck?: (checked: boolean, e: React.MouseEvent) => void;
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  red: "bg-red-100 text-red-700 border-red-200",
  green: "bg-green-100 text-green-700 border-green-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
};

export function EmailRow({ email, isSelected, isChecked, onToggleCheck }: EmailRowProps) {
  return (
    <div className={clsx(
      "flex items-center gap-3 px-5 py-2.5 border-b cursor-pointer transition-colors group",
      isChecked ? "bg-blue-50/80 border-blue-100" : isSelected ? "bg-blue-50/40 border-blue-50" : "border-gray-100 hover:bg-gray-50/50"
    )}>
      {/* Checkbox */}
      <div 
        className="flex-shrink-0 flex items-center justify-center cursor-pointer text-gray-300 hover:text-gray-500 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCheck?.(!isChecked, e);
        }}
      >
        {isChecked ? (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        )}
      </div>

      {/* Unread Indicator */}
      <div className="w-2 flex-shrink-0 flex justify-center">
        {email.is_unread && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Sender */}
      <div className={clsx(
        "w-36 flex-shrink-0 text-sm truncate",
        email.is_unread ? "font-semibold text-gray-900" : "font-medium text-gray-600"
      )}>
        {email.sender_name || email.sender_email}
      </div>

      {/* Summary / Subject */}
      <div className={clsx(
        "flex-1 text-sm truncate",
        email.is_unread ? "font-medium text-gray-800" : "text-gray-500"
      )}>
        <span className="text-gray-900 font-medium mr-2">{email.subject}</span>
        <span className="text-gray-500 opacity-80">{email.summary}</span>
      </div>

      {/* Category Badge */}
      {email.category ? (
        <div className="flex-shrink-0">
          <span className={clsx(
            "px-2.5 py-0.5 rounded-full text-xs font-medium border",
            colorMap[email.categoryColor] || "bg-gray-100 text-gray-700 border-gray-200"
          )}>
            {email.category}
          </span>
        </div>
      ) : email.hasAiMetadata ? (
        <div className="flex-shrink-0">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-500 border-gray-200">
            Uncategorized
          </span>
        </div>
      ) : null}

      {/* Timestamp */}
      <div className={clsx(
        "w-20 text-right text-xs flex-shrink-0",
        email.is_unread ? "font-medium text-gray-900" : "text-gray-400"
      )}>
        {email.timestamp}
      </div>
    </div>
  );
}
