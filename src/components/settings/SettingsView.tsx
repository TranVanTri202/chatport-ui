"use client";

import type { AccentKey, DashboardLayout, Language, ThemeMode } from "@/types";
import { ACCENTS } from "@/constants/mockData";
import { usePreferences } from "@/hooks/usePreferences";
import { Icon, type IconName } from "@/components/ui/Icon";

export function SettingsView(): JSX.Element {
  const { preferences, setPreference } = usePreferences();
  const vi = preferences.lang === "vi";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[680px] p-[28px_34px_50px]">
        <h1 className="mb-6 font-display text-[25px] font-semibold tracking-tight">{vi ? "Cài đặt chung" : "Settings"}</h1>
        <div className="rounded-card border border-border bg-surface p-1 shadow-card">
          <Row icon="globe" label={vi ? "Ngôn ngữ" : "Language"}>
            <Segmented<Language>
              value={preferences.lang}
              options={[["vi", "Tiếng Việt"], ["en", "English"]]}
              onChange={(v) => setPreference("lang", v)}
            />
          </Row>
          <Row icon="sparkle" label={vi ? "Giao diện" : "Theme"}>
            <Segmented<ThemeMode>
              value={preferences.theme}
              options={[["dark", vi ? "Tối" : "Dark"], ["light", vi ? "Sáng" : "Light"]]}
              onChange={(v) => setPreference("theme", v)}
            />
          </Row>
          <Row icon="dot" label={vi ? "Màu nhấn" : "Accent"}>
            <div className="flex gap-2">
              {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setPreference("accent", key)}
                  className="h-[30px] w-[30px] rounded-[9px]"
                  style={{ background: ACCENTS[key].accent, outline: preferences.accent === key ? "2px solid var(--text)" : "none", outlineOffset: 2 }}
                />
              ))}
            </div>
          </Row>
          <Row icon="dashboard" label={vi ? "Bố cục Dashboard" : "Dashboard layout"}>
            <Segmented<DashboardLayout>
              value={preferences.dashLayout}
              options={[["grid", vi ? "Lưới" : "Grid"], ["table", vi ? "Bảng" : "Table"], ["group", vi ? "Nhóm" : "Group"]]}
              onChange={(v) => setPreference("dashLayout", v)}
            />
          </Row>
          <Row icon="settings" label={vi ? "Mật độ" : "Density"} last>
            <Segmented<"compact" | "regular">
              value={preferences.density}
              options={[["compact", vi ? "Gọn" : "Compact"], ["regular", vi ? "Vừa" : "Regular"]]}
              onChange={(v) => setPreference("density", v)}
            />
          </Row>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children, last = false }: { readonly icon: IconName; readonly label: string; readonly children: React.ReactNode; readonly last?: boolean }): JSX.Element {
  return (
    <div className={`flex items-center gap-3.5 p-4 ${last ? "" : "border-b border-border-soft"}`}>
      <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-surface-3 text-muted"><Icon name={icon} size={17} /></span>
      <div className="flex-1 text-[13.5px] font-semibold">{label}</div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { readonly value: T; readonly options: ReadonlyArray<readonly [T, string]>; readonly onChange: (v: T) => void }): JSX.Element {
  return (
    <div className="inline-flex gap-0.5 rounded-[10px] border border-border bg-surface-2 p-[3px]">
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition ${value === key ? "bg-surface-3 text-text" : "text-muted hover:text-text"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
