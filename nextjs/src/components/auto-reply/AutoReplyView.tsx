"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { AutoReplyConfig, ModelName, ReferenceDoc } from "@/types";
import { defaultAutoReply } from "@/constants/mockData";
import { useAccounts } from "@/hooks/useAccounts";
import { usePreferences } from "@/hooks/usePreferences";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Toggle } from "@/components/ui/Toggle";
import { api } from "@/lib/api";

export function AutoReplyView(): JSX.Element {
  const { accounts, refreshAccounts } = useAccounts() as any;
  const { preferences } = usePreferences();
  const vi = preferences.lang === "vi";
  
  const [selected, setSelected] = useState(accounts[0]?.id ?? "");
  const account = accounts.find((a: any) => a.id === selected) ?? accounts[0];
  
  const [cfg, setCfg] = useState<AutoReplyConfig>(() => defaultAutoReply(account?.model ?? "Claude Sonnet"));
  const [adding, setAdding] = useState(false);

  // Load config from backend
  useEffect(() => {
    if (!account) return;
    
    const loadConfig = async () => {
      try {
        const promptRes = await api.get<{ systemPrompt: string }>(`/bots/zalo/${account.phone}/system-prompt`);
        const docsRes = await api.get<any[]>(`/bots/zalo/${account.phone}/documents`);
        const botDetail = await api.get<{ bot: any }>(`/bots/zalo/${account.phone}`);
        
        const mappedDocs: ReferenceDoc[] = docsRes.map((d) => ({
          id: String(d.id),
          type: d.mimeType?.includes("sheet") ? "sheet" : d.mimeType?.includes("doc") ? "doc" : "link",
          name: d.title,
          meta: d.source || "URL Source",
        }));

        setCfg({
          enabled: botDetail.bot.autoReplyEnabled,
          prompt: promptRes.systemPrompt || "",
          docs: mappedDocs,
          model: botDetail.bot.llmModel === "gpt-4o-mini" ? "Claude Haiku" : "Claude Sonnet",
          hours: botDetail.bot.activeHours || "24/7",
          fallback: botDetail.bot.fallbackReplies || [],
        });
      } catch (err) {
        console.error("Failed to load AutoReply configuration:", err);
      }
    };

    void loadConfig();
    setAdding(false);
  }, [selected, account]);

  if (!account) return <div />;

  const savePrompt = async (): Promise<void> => {
    try {
      await api.patch(`/bots/zalo/${account.phone}/system-prompt`, {
        systemPrompt: cfg.prompt,
      });
    } catch (error) {
      alert("Lỗi khi lưu prompt: " + (error instanceof Error ? error.message : ""));
    }
  };

  const toggleEnabled = async (enabled: boolean): Promise<void> => {
    setCfg((c) => ({ ...c, enabled }));
    try {
      await api.patch(`/bots/zalo/${account.phone}`, {
        autoReplyEnabled: enabled,
      });
      if (refreshAccounts) void refreshAccounts();
    } catch (error) {
      console.error("Failed to toggle AI status:", error);
    }
  };

  const updateModel = async (model: ModelName): Promise<void> => {
    setCfg((c) => ({ ...c, model }));
    try {
      await api.patch(`/bots/zalo/${account.phone}`, {
        llmModel: model === "Claude Haiku" ? "gpt-4o-mini" : "gpt-4o",
      });
    } catch (error) {
      console.error("Failed to update AI model:", error);
    }
  };

  const updateHours = async (hours: string): Promise<void> => {
    setCfg((c) => ({ ...c, hours }));
    try {
      await api.patch(`/bots/zalo/${account.phone}`, {
        activeHours: hours,
      });
    } catch (error) {
      console.error("Failed to update active hours:", error);
    }
  };

  const addDocument = async (doc: Omit<ReferenceDoc, "id">): Promise<void> => {
    try {
      let response: any;
      if (doc.type === "link") {
        response = await api.post(`/bots/zalo/${account.phone}/documents/import-url`, {
          url: doc.meta,
          title: doc.name,
        });
      } else {
        response = await api.post(`/bots/zalo/${account.phone}/documents`, {
          title: doc.name,
          rawText: doc.meta, // for simple sheets/docs we treat content as plain text
          source: doc.meta,
          mimeType: doc.type,
        });
      }

      const newDoc: ReferenceDoc = {
        id: String(response.id),
        type: doc.type,
        name: doc.name,
        meta: doc.meta,
      };

      setCfg((c) => ({ ...c, docs: [...c.docs, newDoc] }));
    } catch (error) {
      alert("Lỗi khi thêm tài liệu: " + (error instanceof Error ? error.message : ""));
    }
  };

  const removeDocument = async (docId: string): Promise<void> => {
    try {
      await api.delete(`/bots/zalo/${account.phone}/documents/${docId}`);
      setCfg((c) => ({ ...c, docs: c.docs.filter((x) => x.id !== docId) }));
    } catch (error) {
      console.error("Failed to remove document:", error);
    }
  };

  return (
    <div className="grid h-full overflow-hidden [grid-template-columns:248px_1fr]">
      <aside className="flex min-h-0 flex-col border-r border-border bg-surface-0">
        <div className="border-b border-border p-[18px_16px_12px] text-[12.5px] font-semibold text-muted">{vi ? "Tài khoản" : "Accounts"}</div>
        <div className="flex flex-col gap-1 overflow-y-auto p-2">
          {accounts.map((a: any) => (
            <button key={a.id} onClick={() => setSelected(a.id)} className={`flex items-center gap-2.5 rounded-[10px] p-[8px_10px] text-left ${a.id === account.id ? "bg-accent-dim" : "hover:bg-surface-2"}`}>
              <Avatar spec={a.avatar} size={32} />
              <span className="flex-1 truncate text-[12.5px] font-semibold">{a.name}</span>
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: a.auto ? "var(--accent)" : "var(--surface-3)" }} />
            </button>
          ))}
        </div>
      </aside>

      <div className="overflow-y-auto">
        <div className="mx-auto max-w-[760px] p-[26px_32px_60px]">
          <h1 className="font-display text-[23px] font-semibold tracking-tight">{vi ? "Cấu hình Auto Reply" : "Auto Reply"}</h1>
          <div className="mt-1.5 flex items-center gap-2 text-[13.5px] text-muted">
            <Avatar spec={account.avatar} size={20} /> {account.name} · {vi ? "mỗi mục lưu riêng" : "save each section"}
          </div>

          <div className="my-[18px] flex items-center gap-3.5 rounded-card border p-[18px]" style={{ borderColor: cfg.enabled ? "var(--accent-border)" : "var(--border)", background: cfg.enabled ? "var(--accent-dim)" : "var(--surface)" }}>
            <span className="grid h-[42px] w-[42px] place-items-center rounded-[11px]" style={{ background: cfg.enabled ? "var(--accent)" : "var(--surface-3)", color: cfg.enabled ? "#0a1f16" : "var(--muted)" }}><Icon name="bot" size={22} /></span>
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold">{vi ? "Kích hoạt tự trả lời" : "Enable auto reply"}</div>
              <div className="mt-0.5 text-[12.5px] text-muted">{vi ? "AI sẽ tự động trả lời tin nhắn đến" : "AI answers incoming messages"}</div>
            </div>
            <Toggle on={cfg.enabled} onChange={(v) => toggleEnabled(v)} />
          </div>

          <div>
            <Section icon="sparkle" title={vi ? "Prompt hệ thống" : "System prompt"} onSave={savePrompt} vi={vi}>
              <textarea value={cfg.prompt} onChange={(e) => setCfg((c) => ({ ...c, prompt: e.target.value }))} rows={6} className="w-full resize-y rounded-xl border border-border bg-surface-2 p-3.5 text-[13.5px] leading-relaxed text-text outline-none focus:border-accent-border" />
            </Section>

            <Section icon="doc" title={vi ? "Tài liệu tham chiếu" : "Reference docs"} onSave={() => {}} vi={vi} showSave={false}>
              <div className="flex flex-col gap-2">
                {cfg.docs.map((d) => <DocRow key={d.id} doc={d} onRemove={() => removeDocument(d.id)} />)}
              </div>
              {adding ? (
                <AddDocForm vi={vi} onAdd={(d) => { void addDocument(d); setAdding(false); }} onCancel={() => setAdding(false)} />
              ) : (
                <button onClick={() => setAdding(true)} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-2.5 text-[13px] font-medium text-muted hover:border-accent-border hover:text-accent">
                  <Icon name="plus" size={15} /> {vi ? "Thêm tài liệu" : "Add document"}
                </button>
              )}
            </Section>

            <div className="grid grid-cols-2 gap-3.5">
              <Section icon="bot" title={vi ? "Mô hình AI" : "Model"} onSave={() => {}} vi={vi} compact showSave={false}>
                <div className="inline-flex w-full gap-0.5 rounded-[10px] border border-border bg-surface-2 p-[3px]">
                  {(["Claude Haiku", "Claude Sonnet"] as ModelName[]).map((m) => (
                    <button key={m} onClick={() => updateModel(m)} className={`flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium ${cfg.model === m ? "bg-surface-3 text-text" : "text-muted"}`}>{m.replace("Claude ", "")}</button>
                  ))}
                </div>
              </Section>
              <Section icon="clock" title={vi ? "Khung giờ" : "Active hours"} onSave={() => updateHours(cfg.hours)} vi={vi} compact>
                <div className="flex items-center gap-2 rounded-[10px] border border-border bg-surface-2 p-[8px_12px] text-sm">
                  <Icon name="clock" size={15} className="text-muted" />
                  <input value={cfg.hours} onChange={(e) => setCfg((c) => ({ ...c, hours: e.target.value }))} className="flex-1 bg-transparent text-text outline-none" />
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children, onSave, vi, compact = false, showSave = true }: { readonly icon: IconName; readonly title: string; readonly children: ReactNode; readonly onSave: () => void; readonly vi: boolean; readonly compact?: boolean; readonly showSave?: boolean }): JSX.Element {
  return (
    <div className={compact ? "" : "mb-[22px]"}>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold"><span className="text-accent"><Icon name={icon} size={16} /></span>{title}</h3>
        {showSave && <SaveButton onSave={onSave} vi={vi} />}
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onSave, vi }: { readonly onSave: () => void; readonly vi: boolean }): JSX.Element {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { onSave(); setDone(true); setTimeout(() => setDone(false), 1700); }}
      className={`inline-flex items-center gap-1.5 rounded-[9px] border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${done ? "border-transparent bg-accent text-[#0a1f16]" : "border-accent-border bg-accent-dim text-accent hover:bg-accent hover:text-[#0a1f16]"}`}
    >
      <Icon name="check" size={13} /> {done ? (vi ? "Đã lưu" : "Saved") : vi ? "Lưu" : "Save"}
    </button>
  );
}

function DocRow({ doc, onRemove }: { readonly doc: ReferenceDoc; readonly onRemove: () => void }): JSX.Element {
  const color = doc.type === "sheet" ? "#3aa564" : doc.type === "doc" ? "#5b88c4" : "var(--muted)";
  const icon: IconName = doc.type === "sheet" ? "sheet" : doc.type === "doc" ? "doc" : "link";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-[11px_13px]">
      <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-surface-3" style={{ color }}><Icon name={icon} size={17} /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{doc.name}</div>
        <div className="truncate text-[11.5px] text-muted">{doc.meta}</div>
      </div>
      <button onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-[9px] border border-border text-muted hover:text-danger"><Icon name="trash" size={14} /></button>
    </div>
  );
}

function AddDocForm({ vi, onAdd, onCancel }: { readonly vi: boolean; readonly onAdd: (doc: Omit<ReferenceDoc, "id">) => void; readonly onCancel: () => void }): JSX.Element {
  const [type, setType] = useState<ReferenceDoc["type"]>("sheet");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const can = name.trim().length > 0 && link.trim().length > 0;
  return (
    <div className="mt-2.5 flex flex-col gap-2.5 rounded-card border border-border bg-surface-2 p-3.5">
      <div className="inline-flex w-full gap-0.5 rounded-[10px] border border-border bg-surface-0 p-[3px]">
        {(["sheet", "doc", "link"] as const).map((k) => (
          <button key={k} onClick={() => setType(k)} className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-medium ${type === k ? "bg-surface-3 text-text" : "text-muted"}`}>{k === "sheet" ? "Google Sheets" : k === "doc" ? "Google Docs" : vi ? "Đường link" : "Link"}</button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={vi ? "Tên tài liệu…" : "Document name…"} className="rounded-[10px] border border-border bg-surface-0 p-[11px_13px] text-[13.5px] text-text outline-none focus:border-accent-border" />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={vi ? "Dán nội dung hoặc đường link…" : "Paste content or link…"} className="rounded-[10px] border border-border bg-surface-0 p-[11px_13px] text-[13.5px] text-text outline-none focus:border-accent-border" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>{vi ? "Huỷ" : "Cancel"}</Button>
        <Button size="sm" icon="plus" onClick={() => { if (can) onAdd({ type, name: name.trim(), meta: link.trim() }); }} style={{ opacity: can ? 1 : 0.45, pointerEvents: can ? "auto" : "none" }}>{vi ? "Thêm" : "Add"}</Button>
      </div>
    </div>
  );
}
