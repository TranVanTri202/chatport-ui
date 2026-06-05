"use client";

import type { ReactNode } from "react";
import { useAppContext } from "@/providers/AppProvider";
import { usePreferences } from "@/hooks/usePreferences";
import { LoginView } from "@/components/auth/LoginView";
import { NavRail } from "./NavRail";

/** App chrome: gates on auth, else renders nav rail + routed main content. */
export function AppShell({ children }: { readonly children: ReactNode }): JSX.Element {
  const { authed, setAuthed } = useAppContext();
  // Subscribe so theme/accent/density side-effects run app-wide.
  usePreferences();

  if (!authed) return <LoginView onLogin={() => setAuthed(true)} />;

  return (
    <div className="grid h-screen overflow-hidden [grid-template-columns:auto_1fr]">
      <NavRail />
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
