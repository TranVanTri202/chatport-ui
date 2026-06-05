"use client";

import type { Account } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { Toggle } from "@/components/ui/Toggle";
import { usePreferences } from "@/hooks/usePreferences";

interface AccountCardProps {
  readonly account: Account;
  readonly onOpen: (account: Account) => void;
  readonly onToggleAuto: (id: string) => void;
  readonly onRelogin: (id: string) => void;
}

export function AccountCard({ account, onOpen, onToggleAuto, onRelogin }: AccountCardProps): JSX.Element {
  const { t } = usePreferences();
  const expired = account.status === "expired";

  return (
    <button
      type="button"
      onClick={() => onOpen(account)}
      className="flex flex-col gap-3.5 rounded-card border bg-surface p-[18px] text-left transition hover:-translate-y-0.5 hover:border-accent-border"
      style={{ borderColor: expired ? "rgba(217,104,95,.3)" : "var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <Avatar spec={account.avatar} size={46} status={account.status} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold">{account.name}</div>
          <div className="mt-0.5 text-xs text-muted">{account.phone}</div>
        </div>
        {account.unread > 0 ? (
          <span className="rounded-[7px] bg-accent-dim px-1.5 py-0.5 text-[11.5px] font-semibold text-accent">
            {account.unread}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <StatusPill status={account.status} />
        {account.auto && !expired ? (
          <Badge>
            <Icon name="bot" size={12} /> AI
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center gap-[18px] border-t border-border pt-3">
        <Stat value={account.today} label={t("msgsToday")} />
        <Stat value={account.aiToday} label={t("aiSent")} />
        <div className="ml-auto">
          {expired ? (
            <span onClick={(e) => e.stopPropagation()}>
              <Button size="sm" icon="qr" onClick={() => onRelogin(account.id)}>
                {t("relogin")}
              </Button>
            </span>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              <Toggle on={account.auto} onChange={() => onToggleAuto(account.id)} />
              <span className="text-[10.5px] text-muted">{t("autoReply")}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function Stat({ value, label }: { readonly value: number; readonly label: string }): JSX.Element {
  return (
    <div>
      <div className="text-[17px] font-semibold">{value}</div>
      <div className="mt-px text-[11px] text-muted">{label}</div>
    </div>
  );
}
