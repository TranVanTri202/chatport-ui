"use client";

import type { InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface SearchBoxProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly onClear?: () => void;
}

/** Reusable search input with leading icon + optional clear button. */
export function SearchBox({ value, onClear, className = "", ...rest }: SearchBoxProps): JSX.Element {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3 focus-within:border-accent-border ${className}`}>
      <Icon name="search" size={15} className="text-muted" />
      <input
        value={value}
        className="flex-1 bg-transparent py-2.5 text-[13.5px] text-text outline-none placeholder:text-muted"
        {...rest}
      />
      {onClear && typeof value === "string" && value.length > 0 ? (
        <button onClick={onClear} className="flex p-0.5 text-muted hover:text-text">
          <Icon name="x" size={14} />
        </button>
      ) : null}
    </div>
  );
}
