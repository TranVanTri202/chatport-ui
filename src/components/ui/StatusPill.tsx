"use client";

import type { AccountStatus } from "@/types";
import { usePreferences } from "@/hooks/usePreferences";

const STYLE: Record<AccountStatus, { color: string; bg: string }> = {
  online: { color: "var(--accent)", bg: "var(--accent-dim)" },
  syncing: { color: "var(--warning)", bg: "rgba(245,176,66,.12)" },
  offline: { color: "#7c8794", bg: "rgba(124,135,148,.12)" },
  expired: { color: "var(--danger)", bg: "rgba(217,104,95,.13)" },
};

export function StatusPill({ status }: { readonly status: AccountStatus }): JSX.Element {
  const { t } = usePreferences();
  const s = STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {t(status)}
    </span>
  );
}
