"use client";

import { useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { usePreferences } from "@/hooks/usePreferences";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { Toggle } from "@/components/ui/Toggle";
import { QrModal } from "@/components/accounts/QrModal";

export function AccountsView(): JSX.Element {
  const { accounts, toggleAuto, removeAccount, refreshAccounts } = useAccounts();
  const { preferences } = usePreferences();
  const vi = preferences.lang === "vi";
  const [qr, setQr] = useState<{ id: string; relogin: boolean } | null>(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1080px] p-[28px_34px_50px]">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-[25px] font-semibold tracking-tight">{vi ? "Quản lý tài khoản" : "Accounts"}</h1>
            <p className="mt-1.5 text-[13.5px] text-muted">{vi ? "Thêm, đăng nhập và quản lý các tài khoản Zalo" : "Add, log in and manage Zalo accounts"}</p>
          </div>
          <Button icon="qr" onClick={() => setQr({ id: "new", relogin: false })}>{vi ? "Đăng nhập bằng QR" : "Login with QR"}</Button>
        </header>

        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {accounts.map((a, i) => {
            const broken = a.status === "expired" || a.status === "offline";
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3.5 p-[15px_18px] ${i < accounts.length - 1 ? "border-b border-border-soft" : ""}`}
                style={{ background: a.status === "expired" ? "rgba(217,104,95,.05)" : "transparent" }}
              >
                <Avatar spec={a.avatar} size={42} status={a.status} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.name}</div>
                  <div className="mt-0.5 text-xs text-muted">{a.phone}</div>
                </div>
                <div className="w-[140px]"><StatusPill status={a.status} /></div>
                <div className="flex w-[84px] items-center gap-2" style={{ opacity: a.status === "expired" ? 0.4 : 1 }}>
                  <Toggle on={a.auto && a.status !== "expired"} disabled={a.status === "expired"} onChange={() => toggleAuto(a.id)} />
                  <span className="text-[11.5px] text-muted">AI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {broken ? (
                    <Button size="sm" icon="qr" onClick={() => setQr({ id: a.id, relogin: true })}>{vi ? "Đăng nhập lại" : "Re-login"}</Button>
                  ) : null}
                  <button onClick={() => removeAccount(a.id)} className="grid h-7 w-7 place-items-center rounded-[9px] border border-border text-muted hover:text-danger">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
