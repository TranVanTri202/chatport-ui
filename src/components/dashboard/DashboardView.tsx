"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account } from "@/types";
import { useAccounts } from "@/hooks/useAccounts";
import { usePreferences } from "@/hooks/usePreferences";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "./StatCard";
import { AccountCard } from "./AccountCard";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { Toggle } from "@/components/ui/Toggle";
import { QrModal } from "@/components/accounts/QrModal";

/**
 * Dashboard feature view. Pure composition: all data + mutations come from
 * `useAccounts`; no fetching or business logic lives here.
 */
export function DashboardView(): JSX.Element {
  const { preferences, t } = usePreferences();
  const { accounts, stats, toggleAuto, refreshAccounts } = useAccounts();
  const router = useRouter();
  const vi = preferences.lang === "vi";
  const layout = preferences.dashLayout;
  const [qr, setQr] = useState<{ id: string; relogin: boolean } | null>(null);

  const openChat = (account: Account): void => {
    router.push(`/chat?account=${account.id}`);
  };

  const viewProps = {
    accounts,
    onOpen: openChat,
    onToggleAuto: toggleAuto,
    onRelogin: (id: string) => setQr({ id, relogin: true }),
    vi,
    t,
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1320px] p-[28px_34px_40px]">
        <header className="mb-6 flex items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-[27px] font-semibold tracking-tight">{t("overview")}</h1>
            <p className="mt-1.5 text-sm text-muted">{t("overviewSub")}</p>
          </div>
          <Button icon="plus" onClick={() => setQr({ id: "new", relogin: false })}>{t("addAccount")}</Button>
        </header>

        <section className="mb-7 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <StatCard label={t("totalAccounts")} value={stats.total} icon="users" />
          <StatCard label={t("activeNow")} value={stats.online} sub={`/ ${stats.total}`} icon="dot" accent />
          <StatCard label={t("unreadTotal")} value={stats.unread} icon="chat" />
          <StatCard label={t("autoActive")} value={stats.autoOn} icon="bot" accent />
          <StatCard label={t("repliesToday")} value={stats.aiReplies} icon="sparkle" />
        </section>

        {stats.expired > 0 ? (
          <div className="mb-[18px] flex flex-wrap items-center gap-3 rounded-card border border-[rgba(217,104,95,.22)] bg-[rgba(217,104,95,.08)] p-[13px_16px]">
            <Icon name="alert" size={18} className="text-danger" />
            <span className="text-[13px] font-semibold text-danger">
              {stats.expired} {t("expiredBanner")}
            </span>
            <span className="text-[12.5px] text-muted">{t("expiredHint")}</span>
          </div>
        ) : null}

        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
          {t("allAccounts")}
          <span className="text-xs font-medium text-muted">{stats.total}</span>
        </h2>

        {layout === "table" ? (
          <TableView {...viewProps} />
        ) : layout === "group" ? (
          <GroupView {...viewProps} />
        ) : (
          <GridView {...viewProps} />
        )}
      </div>

      {qr ? (
        <QrModal
          relogin={qr.relogin}
          accountName={qr.relogin ? accounts.find((a) => a.id === qr.id)?.name : undefined}
          onClose={() => setQr(null)}
          onConnect={() => {
            void refreshAccounts();
            setQr(null);
          }}
        />
      ) : null}
    </div>
  );
}

function GridView({
  accounts,
  onOpen,
  onToggleAuto,
  onRelogin,
}: {
  readonly accounts: ReadonlyArray<Account>;
  readonly onOpen: (account: Account) => void;
  readonly onToggleAuto: (id: string) => void;
  readonly onRelogin: (id: string) => void;
}): JSX.Element {
  return (
    <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(290px,1fr))]">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onOpen={onOpen}
          onToggleAuto={onToggleAuto}
          onRelogin={onRelogin}
        />
      ))}
    </div>
  );
}

function TableView({
  accounts,
  onOpen,
  onToggleAuto,
  onRelogin,
  vi,
  t,
}: {
  readonly accounts: ReadonlyArray<Account>;
  readonly onOpen: (account: Account) => void;
  readonly onToggleAuto: (id: string) => void;
  readonly onRelogin: (id: string) => void;
  readonly vi: boolean;
  readonly t: (key: string) => string;
}): JSX.Element {
  const cols = "grid grid-cols-[minmax(220px,2.2fr)_1.1fr_1fr_80px_80px_120px] gap-3 items-center";
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className={`${cols} border-b border-border p-[11px_18px] text-[11.5px] font-semibold uppercase tracking-[.04em] text-muted`}>
        <span>{t("name")}</span>
        <span>{t("status")}</span>
        <span>{t("lastActive")}</span>
        <span className="text-right">{t("unread")}</span>
        <span className="text-right">{t("msgsToday")}</span>
        <span className="text-right">{t("autoReply")}</span>
      </div>
      {accounts.map((a) => {
        const expired = a.status === "expired";
        return (
          <div
            key={a.id}
            onClick={() => onOpen(a)}
            className={`${cols} border-b border-border-soft p-[13px_18px] cursor-pointer hover:bg-surface-2 transition`}
            style={{ background: expired ? "rgba(217,104,95,.05)" : "transparent" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar spec={a.avatar} size={34} status={a.status} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold truncate">{a.name}</div>
                <div className="text-[11.5px] text-muted">{a.phone}</div>
              </div>
            </div>
            <span><StatusPill status={a.status} /></span>
            <span className="text-sm text-muted">{a.lastActive === "now" ? (vi ? "vừa xong" : "now") : a.lastActive}</span>
            <span className={`text-right text-[13px] font-semibold ${a.unread ? "text-accent" : "text-muted"}`}>{a.unread || "–"}</span>
            <span className="text-right text-[13px]">{a.today}</span>
            <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              {expired ? (
                <button
                  onClick={() => onRelogin(a.id)}
                  className="flex items-center gap-1.5 rounded-[9px] bg-accent p-[6px_12px] text-xs font-semibold text-[#0a1f16] hover:brightness-95 transition"
                >
                  <Icon name="qr" size={13} /> {vi ? "Đăng nhập lại" : "Re-login"}
                </button>
              ) : (
                <Toggle on={a.auto} onChange={() => onToggleAuto(a.id)} />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function GroupView({
  accounts,
  onOpen,
  onToggleAuto,
  onRelogin,
  vi,
  t,
}: {
  readonly accounts: ReadonlyArray<Account>;
  readonly onOpen: (account: Account) => void;
  readonly onToggleAuto: (id: string) => void;
  readonly onRelogin: (id: string) => void;
  readonly vi: boolean;
  readonly t: (key: string) => string;
}): JSX.Element {
  const groups = [
    { key: "online" as const, label: t("online"), c: "var(--accent)" },
    { key: "syncing" as const, label: t("syncing"), c: "#f5b042" },
    { key: "expired" as const, label: t("expired"), c: "#d9685f" },
    { key: "offline" as const, label: t("offline"), c: "#7c8794" },
  ].filter((g) => g.key !== "expired" || accounts.some((a) => a.status === "expired"));

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 items-start">
      {groups.map((g) => {
        const items = accounts.filter((a) => a.status === g.key);
        return (
          <div key={g.key} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-0.5">
              <span className="h-2 w-2 rounded-full" style={{ background: g.c }} />
              <span className="text-[13px] font-semibold">{g.label}</span>
              <span className="text-xs text-muted">{items.length}</span>
            </div>
            {items.map((a) => {
              const expired = a.status === "expired";
              return (
                <div
                  key={a.id}
                  onClick={() => onOpen(a)}
                  className="rounded-card border border-border bg-surface p-3 cursor-pointer shadow-card flex gap-3 items-center hover:shadow-card-hover transition"
                  style={{ borderColor: expired ? "rgba(217,104,95,.3)" : "var(--border)" }}
                >
                  <Avatar spec={a.avatar} size={38} status={a.status} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold truncate">{a.name}</div>
                    <div className="flex gap-2 mt-1 items-center">
                      {a.unread > 0 && <span className="text-xs text-accent font-medium">{a.unread} {t("unread")}</span>}
                      {a.auto && a.status !== "expired" && (
                        <span className="inline-flex items-center gap-1 rounded bg-accent-dim p-[2px_6px] text-[10px] font-bold text-accent">
                          <Icon name="bot" size={10} /> AI
                        </span>
                      )}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {expired ? (
                      <button
                        onClick={() => onRelogin(a.id)}
                        className="flex items-center gap-1.5 rounded-[9px] bg-accent p-[6px_12px] text-xs font-semibold text-[#0a1f16] hover:brightness-95 transition"
                      >
                        <Icon name="qr" size={13} /> {vi ? "Đăng nhập lại" : "Re-login"}
                      </button>
                    ) : (
                      <Toggle on={a.auto} onChange={() => onToggleAuto(a.id)} />
                    )}
                  </div>
                </div>
              );
            })}
            {items.length === 0 && <div className="text-xs text-muted italic p-[14px_2px]">—</div>}
          </div>
        );
      })}
    </div>
  );
}
