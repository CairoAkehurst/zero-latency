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

export function EmailRow({ email, isSelected, isCompressed, isChecked, onToggleCheck }: EmailRowProps) {
  return (
    <div className={clsx(
      "flex items-center gap-4 px-6 py-3 border-b cursor-pointer transition-colors group",
      isChecked ? "bg-blue-50/80 border-blue-100" : isSelected ? "bg-blue-50/40 border-blue-50" : "border-gray-100 hover:bg-gray-50/50"
    )}>
      {/* Checkbox */}
      <div 
        className="flex-shrink-0 flex items-center justify-center pt-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCheck?.(!isChecked, e);
        }}
      >
        <input 
          type="checkbox" 
          checked={isChecked}
          readOnly
          className="w-4 h-4 rounded border-gray-300 accent-blue-600 bg-white cursor-pointer"
        />
      </div>

      {/* Unread Indicator */}
      <div className="w-2 flex-shrink-0 flex justify-center">
        {email.is_unread && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Sender */}
      <div className={clsx(
        isCompressed ? "w-24" : "w-32",
        "flex-shrink-0 text-sm truncate",
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
      {!isCompressed && (
        <div className={clsx(
          "w-24 text-right text-xs flex-shrink-0",
          email.is_unread ? "font-medium text-gray-900" : "text-gray-400"
        )}>
          {email.timestamp}
        </div>
      )}
    </div>
  );
}
