"use client";

import { useState, useEffect, useRef } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { usePreferences } from "@/hooks/usePreferences";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { Toggle } from "@/components/ui/Toggle";
import { QrModal } from "@/components/accounts/QrModal";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";

export function AccountsView(): JSX.Element {
  const { accounts, toggleAuto, removeAccount, refreshAccounts } = useAccounts();
  const { preferences } = usePreferences();
  const vi = preferences.lang === "vi";
  const [qr, setQr] = useState<{ id: string; relogin: boolean } | null>(null);
  const [configBotId, setConfigBotId] = useState<string | null>(null);

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
                  {!broken && (
                    <button onClick={() => setConfigBotId(a.id)} className="grid h-7 w-7 place-items-center rounded-[9px] border border-border text-muted hover:text-text" title={vi ? "Cấu hình" : "Configure"}>
                      <Icon name="settings" size={14} />
                    </button>
                  )}
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

      {configBotId ? (
        <BotConfigModal
          botId={configBotId}
          onClose={() => setConfigBotId(null)}
          vi={vi}
          refreshAccounts={refreshAccounts}
        />
      ) : null}
    </div>
  );
}

interface BotConfigModalProps {
  readonly botId: string;
  readonly onClose: () => void;
  readonly vi: boolean;
  readonly refreshAccounts: () => void;
}

function BotConfigModal({
  botId,
  onClose,
  vi,
  refreshAccounts,
}: BotConfigModalProps): JSX.Element {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [originalName, setOriginalName] = useState("");
  const [originalBio, setOriginalBio] = useState("");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isOffline, setIsOffline] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<{ name: string; avatar: string; bio: string; status: string }>(
          `/channels/zalo/profile/${botId}`
        );
        if (!active) return;

        const botName = data.name || "";
        const botBio = data.bio || "";
        const botAvatar = data.avatar || "";

        setOriginalName(botName);
        setOriginalBio(botBio);

        setName(botName);
        setBio(botBio);
        setAvatar(botAvatar);
        setIsOffline(data.status === "offline");
      } catch (err: any) {
        if (!active) return;
        setError(err.message || (vi ? "Không thể tải thông tin Bot" : "Failed to load bot profile"));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchProfile();
    return () => {
      active = false;
    };
  }, [botId, vi]);

  const handleAvatarClick = () => {
    if (isOffline || saving) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(vi ? "Chỉ chấp nhận file hình ảnh!" : "Only image files are allowed!", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast(vi ? "Kích thước ảnh phải nhỏ hơn 2MB!" : "Image size must be less than 2MB!", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const dataUrl = `data:${file.type};name=${encodeURIComponent(file.name)};base64,${base64.split(",")[1]}`;
      setAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (isOffline || saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast(vi ? "Tên hiển thị không được để trống!" : "Display name cannot be empty!", "error");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const body: any = {};
      if (trimmedName !== originalName) body.name = trimmedName;
      if (bio !== originalBio) body.bio = bio;
      if (avatar.startsWith("data:")) body.avatar = avatar;

      await api.patch(`/channels/zalo/profile/${botId}`, body);

      showToast(
        vi ? "Cập nhật cấu hình bot thành công!" : "Bot configuration updated successfully!",
        "success"
      );
      void refreshAccounts();
      onClose();
    } catch (err: any) {
      setError(err.message || (vi ? "Cập nhật thất bại" : "Update failed"));
      showToast(err.message || (vi ? "Lỗi cập nhật cấu hình!" : "Error updating configuration!"), "error");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    name.trim() !== originalName ||
    bio !== originalBio ||
    avatar.startsWith("data:");

  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = (name || "").charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const initials = (name || "ZB")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const previewAvatarSpec = {
    hue,
    initials,
    img: avatar || undefined,
  };

  return (
    <Modal title={vi ? "Cấu hình tài khoản Bot" : "Bot Account Configuration"} onClose={onClose} width={450}>
      <div className="flex flex-col gap-5 py-1">
        {isOffline && (
          <div className="flex items-start gap-2.5 rounded-xl bg-danger/10 p-3 text-[12.5px] font-medium text-danger border border-danger/10">
            <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
            <div>
              {vi
                ? "Tài khoản Bot hiện đang ngoại tuyến. Bạn cần đăng nhập bot để có thể thay đổi hồ sơ."
                : "The Bot account is currently offline. You need to log in to be able to modify the profile."}
            </div>
          </div>
        )}

        {error && !isOffline && (
          <div className="flex items-start gap-2.5 rounded-xl bg-danger/10 p-3 text-[12.5px] font-medium text-danger border border-danger/10">
            <Icon name="alert" size={16} className="shrink-0 mt-0.5" />
            <div className="break-words flex-1">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-accent" />
            <span className="text-[13px] text-muted">{vi ? "Đang tải cấu hình…" : "Loading config…"}</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center gap-3">
              <div
                onClick={handleAvatarClick}
                className={`group relative cursor-pointer overflow-hidden rounded-[22px] transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isOffline ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <Avatar spec={previewAvatarSpec} size={80} />
                {!isOffline && !saving && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 rounded-[22px]">
                    <Icon name="camera" size={20} className="text-white" />
                    <span className="mt-1 text-[10px] font-medium text-white/90">
                      {vi ? "Thay đổi" : "Change"}
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
                disabled={isOffline || saving}
              />
              <span className="text-[11.5px] text-muted">
                {vi ? "Nhấn vào ảnh để thay đổi" : "Click image to change"}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-muted">
                {vi ? "Tên hiển thị" : "Display name"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={vi ? "Nhập tên bot hiển thị..." : "Enter bot display name..."}
                maxLength={40}
                className="w-full rounded-[10px] border border-border bg-surface-0 p-[10px_12px] text-[13.5px] text-text outline-none transition-colors focus:border-accent-border disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isOffline || saving}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12.5px] font-semibold text-muted">
                  {vi ? "Tiểu sử / Trạng thái" : "Bio / Status"}
                </label>
                <span className="text-[10.5px] text-muted">
                  {bio.length}/150
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={vi ? "Nhập tiểu sử hoặc trạng thái của bot..." : "Enter bot bio or status..."}
                maxLength={150}
                rows={3}
                className="w-full resize-none rounded-[10px] border border-border bg-surface-0 p-[10px_12px] text-[13.5px] text-text outline-none transition-colors focus:border-accent-border disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isOffline || saving}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4 mt-2">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={saving}
              >
                {vi ? "Hủy" : "Cancel"}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isOffline || saving || !hasChanges}
              >
                {saving ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>{vi ? "Đang lưu…" : "Saving…"}</span>
                  </div>
                ) : (
                  vi ? "Lưu thay đổi" : "Save changes"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
