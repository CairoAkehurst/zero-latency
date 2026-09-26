const fs = require('fs');
let content = fs.readFileSync('src/components/EmailRow.tsx', 'utf8');

// Modify EmailRow to support compressed mode
content = content.replace(
  /export function EmailRow\(\{ email, isSelected, isChecked, onToggleCheck \}: EmailRowProps\) \{[\s\S]*?\n\}/,
  `export function EmailRow({ email, isSelected, isCompressed, isChecked, onToggleCheck }: EmailRowProps) {
  if (isCompressed) {
    return (
      <div className={clsx(
        "flex items-start gap-2.5 px-4 py-3 border-b cursor-pointer transition-colors group relative",
        isChecked ? "bg-blue-50/80 border-blue-100" : isSelected ? "bg-blue-50 border-blue-100/50 shadow-[inset_4px_0_0_0_#2563eb]" : "border-gray-100 hover:bg-gray-50/50"
      )}>
        <div className="w-2 flex-shrink-0 flex justify-center mt-1">
          {email.is_unread && <div className="w-2 h-2 rounded-full bg-blue-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={clsx("text-[13px] truncate pr-2", email.is_unread ? "font-bold text-gray-900" : "font-semibold text-gray-700")}>
              {email.sender_name || email.sender_email}
            </span>
          </div>
          <div className={clsx("text-[13px] truncate mb-1", email.is_unread ? "font-semibold text-gray-900" : "font-medium text-gray-800")}>
            {email.subject || '(No subject)'}
          </div>
          <div className="text-[12px] text-gray-500 truncate leading-relaxed">
            {email.summary}
          </div>
        </div>
        {email.category && (
          <span className={clsx(
            "absolute top-3 right-4 px-1.5 py-0.5 rounded text-[10px] font-medium border opacity-80",
            colorMap[email.categoryColor] || "bg-gray-100 text-gray-700 border-gray-200"
          )}>
            {email.category.slice(0, 1)}
          </span>
        )}
      </div>
    );
  }

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
        {formatEmailDate(email.timestamp)}
      </div>
    </div>
  );
}
`
);

fs.writeFileSync('src/components/EmailRow.tsx', content);
