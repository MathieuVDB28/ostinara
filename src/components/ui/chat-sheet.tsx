"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ChatSheetProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

/** Un panneau de discussion par-dessus la page, sans perdre ce qu'il y a dessous. */
export function ChatSheet({ title, closeLabel, onClose, children }: ChatSheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-x-0 bottom-0 top-[12%] z-[70] flex flex-col gap-3 rounded-t-2xl border-t border-border bg-background p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] lg:left-auto lg:right-4 lg:top-4 lg:bottom-4 lg:w-[26rem] lg:rounded-2xl lg:border lg:pb-4"
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h2 className="truncate font-display text-xl font-extrabold uppercase leading-none">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  );
}
