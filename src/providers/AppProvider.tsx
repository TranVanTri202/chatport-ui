"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account, Preferences } from "@/types";
import { DEFAULT_PREFERENCES } from "@/constants/mockData";
import { api } from "@/lib/api";
import { io, Socket } from "socket.io-client";

/**
 * Single app-level store for auth + accounts + UI preferences.
 * UI components consume this exclusively through the typed hooks —
 * they never reach into the context value directly.
 */
interface AppState {
  readonly authed: boolean;
  readonly accounts: ReadonlyArray<Account>;
  readonly preferences: Preferences;
  readonly socket: Socket | null;
  setAuthed: (next: boolean) => void;
  toggleAuto: (id: string) => void;
  reloginAccount: (id: string) => void;
  removeAccount: (id: string) => void;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  refreshAccounts: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [authed, setAuthed] = useState(false);
  const [accounts, setAccounts] = useState<ReadonlyArray<Account>>([]);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Check auth state on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        setAuthed(true);
      }
    }
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!authed) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5001/realtime";

    const s = io(wsUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => {
      console.log("WebSocket connected to:", wsUrl);
    });

    s.on("bot:status", (data) => {
      console.log("Bot status changed:", data);
      void refreshAccounts();
    });

    s.on("message:new", () => {
      void refreshAccounts();
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [authed]);

  const refreshAccounts = useCallback(async () => {
    try {
      const bots = await api.get<any[]>("/bots");
      const mapped: Account[] = bots.map((bot) => {
        const initials = (bot.name || "ZB")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        
        let hash = 0;
        const nameStr = bot.name || "";
        for (let i = 0; i < nameStr.length; i++) {
          hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);

        return {
          id: String(bot.id),
          name: bot.name || "Zalo Bot",
          phone: bot.externalId,
          avatar: {
            hue,
            initials,
            img: bot.avatar || undefined,
          },
          status: bot.status === "active" ? "online" : bot.status === "expired" ? "expired" : "offline",
          auto: bot.autoReplyEnabled,
          unread: bot.unread ?? 0,
          today: bot.requestUsed ?? 0,
          aiToday: bot.requestUsed ?? 0,
          lastActive: "now",
          model: bot.llmModel === "gpt-4o-mini" ? "Claude Haiku" : "Claude Sonnet",
          convos: String(bot.id),
          friendsCount: bot._count?.contacts ?? 0,
          requestsCount: bot._count?.friendRequests ?? 0,
        };
      });
      setAccounts(mapped);
    } catch (error) {
      console.error("Failed to fetch accounts/bots:", error);
    }
  }, []);

  // Fetch accounts on auth
  useEffect(() => {
    if (authed) {
      void refreshAccounts();
    } else {
      setAccounts([]);
    }
  }, [authed, refreshAccounts]);

  const toggleAuto = useCallback(async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;
    
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, auto: !a.auto } : a)));

    try {
      await api.patch(`/bots/zalo/${account.phone}`, {
        autoReplyEnabled: !account.auto,
      });
    } catch (error) {
      console.error("Failed to toggle auto reply:", error);
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, auto: account.auto } : a)));
    }
  }, [accounts]);

  const reloginAccount = useCallback(async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;

    try {
      await api.post(`/channels/zalo/login`);
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "syncing" } : a)));
    } catch (error) {
      console.error("Failed to start login:", error);
    }
  }, [accounts]);

  const removeAccount = useCallback(async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;

    try {
      await api.delete(`/bots/zalo/${account.phone}`);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  }, [accounts]);

  const setPreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  const totalUnread = useMemo(() => accounts.reduce((sum, a) => sum + a.unread, 0), [accounts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const baseTitle = "ZaloHub — Multi-account Manager";
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [totalUnread]);

  const value = useMemo<AppState>(
    () => ({ authed, accounts, preferences, socket, setAuthed, toggleAuto, reloginAccount, removeAccount, setPreference, refreshAccounts }),
    [authed, accounts, preferences, socket, toggleAuto, reloginAccount, removeAccount, setPreference, refreshAccounts],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within <AppProvider>");
  return ctx;
}
