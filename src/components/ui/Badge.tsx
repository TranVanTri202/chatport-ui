import type { ReactNode } from "react";

export function Badge({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[7px] bg-accent-dim px-2 py-0.5 text-[11px] font-semibold text-accent">
      {children}
    </span>
  );
}
