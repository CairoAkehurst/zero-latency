"use client";

import { useState } from "react";
import clsx from "clsx";

interface AvatarProps {
  name?: string;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, email, size = "md", className }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const cleanEmail = (email || "").trim().toLowerCase();
  const displayName = name || cleanEmail || "?";
  const initial = displayName.charAt(0).toUpperCase();

  // unavatar resolves Google profile pictures, Gravatar, and domain favicons
  const avatarUrl = cleanEmail
    ? `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=false`
    : null;

  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-10 h-10 text-base font-bold",
  };

  return (
    <div
      className={clsx(
        "rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-blue-50 text-blue-600 font-semibold relative select-none",
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={displayName}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
