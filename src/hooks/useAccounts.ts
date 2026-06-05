"use client";

import { useMemo } from "react";
import type { Account } from "@/types";
import { useAppContext } from "@/providers/AppProvider";

export interface DashboardStats {
  readonly total: number;
  readonly online: number;
  readonly unread: number;
  readonly autoOn: number;
  readonly aiReplies: number;
  readonly expired: number;
}

export interface UseAccountsResult {
  readonly accounts: ReadonlyArray<Account>;
  readonly stats: DashboardStats;
  toggleAuto: (id: string) => void;
  reloginAccount: (id: string) => void;
  removeAccount: (id: string) => void;
  refreshAccounts: () => Promise<void>;
}

/** Feature hook: exposes accounts + derived dashboard stats. Keeps views logic-free. */
export function useAccounts(): UseAccountsResult {
  const { accounts, toggleAuto, reloginAccount, removeAccount, refreshAccounts } = useAppContext();

  const stats = useMemo<DashboardStats>(
    () => ({
      total: accounts.length,
      online: accounts.filter((a) => a.status === "online").length,
      unread: accounts.reduce((sum, a) => sum + a.unread, 0),
      autoOn: accounts.filter((a) => a.auto).length,
      aiReplies: accounts.reduce((sum, a) => sum + a.aiToday, 0),
      expired: accounts.filter((a) => a.status === "expired").length,
    }),
    [accounts],
  );

  return { accounts, stats, toggleAuto, reloginAccount, removeAccount, refreshAccounts };
}

