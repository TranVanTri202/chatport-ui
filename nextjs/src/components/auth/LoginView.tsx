"use client";

import { useState } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api";

export function LoginView({ onLogin }: { readonly onLogin: () => void }): JSX.Element {
  const { preferences } = usePreferences();
  const vi = preferences.lang === "vi";
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("ban@congty.vn");

  const submit = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ accessToken: string }>("/auth/login", { email });
      localStorage.setItem("accessToken", res.accessToken);
      onLogin();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const features: ReadonlyArray<readonly [Parameters<typeof Icon>[0]["name"], string, string]> = [
    ["bot", vi ? "Tự động trả lời bằng AI" : "AI auto replies", vi ? "Prompt & tài liệu cho từng tài khoản" : "Prompt & docs per account"],
    ["chat", vi ? "Tin nhắn & nhóm tập trung" : "Unified messages", vi ? "Mọi hội thoại trong một màn hình" : "All conversations in one place"],
    ["sparkle", vi ? "Nhẹ nhàng, dễ nhìn" : "Gentle on the eyes", vi ? "Giao diện sáng/tối, ít gây mỏi mắt" : "Light/dark, low-strain"],
  ];

  return (
    <div className="grid h-screen overflow-hidden [grid-template-columns:1fr] md:[grid-template-columns:1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-gradient-to-br from-surface-0 to-surface p-14 md:flex">
        <div className="pointer-events-none absolute -right-16 -top-24 h-[360px] w-[360px] rounded-full bg-accent opacity-50 blur-[70px]" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[11px] bg-accent text-[#0a1f16]"><Icon name="chat" size={22} /></div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight">ZaloHub</div>
            <div className="text-xs text-muted">{vi ? "Trung tâm điều phối Zalo" : "Zalo operations console"}</div>
          </div>
        </div>
        <div className="relative">
          <h1 className="mb-9 whitespace-pre-line font-display text-[34px] font-bold leading-tight tracking-tight">
            {vi ? "Quản lý mọi tài khoản Zalo\nở một nơi yên tĩnh." : "Manage every Zalo account\nin one calm place."}
          </h1>
          <div className="flex flex-col gap-5">
            {features.map(([icon, title, sub]) => (
              <div key={title} className="flex items-center gap-3.5">
                <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-accent-dim text-accent"><Icon name={icon} size={19} /></span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-px text-[12.5px] text-muted">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-muted">© 2025 ZaloHub</div>
      </div>

      <div className="grid place-items-center overflow-y-auto p-7">
        <form onSubmit={submit} className="flex w-full max-w-[380px] flex-col">
          <h2 className="font-display text-[25px] font-bold tracking-tight">{vi ? "Chào mừng trở lại" : "Welcome back"}</h2>
          <p className="mb-7 mt-2 text-[13.5px] leading-relaxed text-muted">{vi ? "Đăng nhập để tiếp tục quản lý các tài khoản Zalo của bạn." : "Sign in to continue managing your Zalo accounts."}</p>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-muted">{vi ? "Email hoặc số điện thoại" : "Email or phone"}</span>
            <div className="flex items-center gap-2.5 rounded-[13px] border border-border bg-surface-2 px-3.5 focus-within:border-accent-border">
              <Icon name="users" size={16} className="text-muted" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent py-3.5 text-sm text-text outline-none"
              />
            </div>
          </label>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-muted">{vi ? "Mật khẩu" : "Password"}</span>
            <div className="flex items-center gap-2.5 rounded-[13px] border border-border bg-surface-2 px-3.5 focus-within:border-accent-border">
              <input type={show ? "text" : "password"} placeholder={vi ? "Nhập mật khẩu" : "Password"} className="flex-1 bg-transparent py-3.5 text-sm text-text outline-none" />
              <button type="button" onClick={() => setShow((s) => !s)} className="flex p-1 text-muted hover:text-text"><Icon name={show ? "eyeOff" : "eye"} size={17} /></button>
            </div>
          </label>

          <Button type="submit" size="lg" className="mt-1 w-full">
            {busy ? <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/30 border-t-[#0a1f16]" /> : vi ? "Đăng nhập" : "Sign in"}
          </Button>

          <div className="my-5 flex items-center gap-3.5 text-xs text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{vi ? "hoặc" : "or"}</div>

          <button type="button" onClick={() => submit()} className="flex w-full items-center justify-center gap-2.5 rounded-[13px] border border-border bg-surface-2 py-3.5 text-sm font-medium text-text hover:border-accent-border">
            <GoogleG /> {vi ? "Đăng nhập với Google" : "Continue with Google"}
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleG(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" className="shrink-0">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9h-7.3v5.7C10.8 41.1 16.9 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 27.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5C3 16 2 19.4 2 23s1 7 2.5 10z" />
      <path fill="#EA4335" d="M24 9.5c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 2.9 29.9 1 24 1 16.9 1 10.8 5.9 8 12.7l7.3 5.7c1.7-5.2 6.5-8.9 12.2-8.9z" />
    </svg>
  );
}
