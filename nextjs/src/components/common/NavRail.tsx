"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconName } from "@/components/ui/Icon";
import { Icon } from "@/components/ui/Icon";
import { usePreferences } from "@/hooks/usePreferences";
import { useAppContext } from "@/providers/AppProvider";

interface NavItem {
  readonly href: string;
  readonly icon: IconName;
  readonly labelKey: "nav_dashboard" | "nav_chat" | "nav_contacts" | "nav_autoreply" | "nav_accounts" | "nav_settings";
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/", icon: "dashboard", labelKey: "nav_dashboard" },
  { href: "/chat", icon: "chat", labelKey: "nav_chat" },
  { href: "/contacts", icon: "addr", labelKey: "nav_contacts" },
  { href: "/auto-reply", icon: "bot", labelKey: "nav_autoreply" },
  { href: "/accounts", icon: "users", labelKey: "nav_accounts" },
  { href: "/settings", icon: "settings", labelKey: "nav_settings" },
];

export function NavRail(): JSX.Element {
  const pathname = usePathname();
  const { t } = usePreferences();
  const { setAuthed } = useAppContext();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    setAuthed(false);
  };

  return (
    <nav className="flex w-[232px] flex-col border-r border-border bg-surface-0">
      <div className="flex items-center gap-3 border-b border-border p-[18px_16px_14px]">
        <div className="grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-accent text-[#0a1f16]">
          <Icon name="chat" size={19} />
        </div>
        <div>
          <div className="font-display text-[15px] font-semibold tracking-tight">ZaloHub</div>
          <div className="text-[10.5px] text-muted">{t("appTag")}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-[8px_10px]">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] font-medium transition ${
                active ? "bg-accent-dim text-accent" : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Icon name={item.icon} size={19} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>

      {/* Logout button at the bottom */}
      <div className="border-t border-border p-[10px_10px_14px_10px]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-[#ea4335]"
        >
          <Icon name="logout" size={19} />
          {t("nav_logout")}
        </button>
      </div>
    </nav>
  );
}
