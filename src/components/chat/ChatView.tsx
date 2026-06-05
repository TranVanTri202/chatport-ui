"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Account, Conversation, Message } from "@/types";
import { useAccounts } from "@/hooks/useAccounts";
import { useChat } from "@/hooks/useChat";
import { usePreferences } from "@/hooks/usePreferences";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SearchBox } from "@/components/ui/SearchBox";
import { StatusPill } from "@/components/ui/StatusPill";
import { Toggle } from "@/components/ui/Toggle";
import { ChatInfoPanel } from "./ChatInfoPanel";

interface ChatViewProps {
  readonly initialAccountId?: string;
  readonly initialConvoId?: string;
}

/** Messages screen container. Account switching + conversation selection live here;
 *  message state is owned by `useChat`. */
export function ChatView({ initialAccountId, initialConvoId }: ChatViewProps): JSX.Element {
  const { accounts } = useAccounts();
  const { preferences } = usePreferences();
  const vi = preferences.lang === "vi";
  const [accountId, setAccountId] = useState(initialAccountId ?? accounts[0]?.id ?? "");
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];

  if (!account) return <div />;
  return <ChatWorkspace key={account.id} account={account} accounts={accounts} vi={vi} onSwitch={setAccountId} initialConvoId={initialConvoId} />;
}

function ChatWorkspace({ account, accounts, vi, onSwitch, initialConvoId }: { readonly account: Account; readonly accounts: ReadonlyArray<Account>; readonly vi: boolean; readonly onSwitch: (id: string) => void; readonly initialConvoId?: string }): JSX.Element {
  const { conversations, active, messages, selectConversation, sendText, sendImage, sendFile } = useChat(account.convos, initialConvoId);
  const [filter, setFilter] = useState<"all" | "direct" | "group">("all");
  const [query, setQuery] = useState("");
  const [botMenu, setBotMenu] = useState(false);
  const expired = account.status === "expired";

  const filtered = useMemo(
    () => conversations.filter((c) => {
      const okType = filter === "all" || c.type === filter;
      const q = query.trim().toLowerCase();
      return okType && (!q || `${c.name} ${c.last}`.toLowerCase().includes(q));
    }),
    [conversations, filter, query],
  );

  return (
    <div className="grid h-full overflow-hidden [grid-template-columns:320px_1fr_290px]">
      {/* conversation list */}
      <div className="flex min-h-0 flex-col border-r border-border bg-surface-0">
        <div className="relative border-b border-border p-[14px_14px_12px]">
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => setBotMenu((v) => !v)} className="flex flex-1 items-center gap-2.5 rounded-[11px] border border-transparent p-[5px_6px] hover:bg-surface-2">
              <Avatar spec={account.avatar} size={34} status={account.status} />
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-semibold">{account.name}</span>
                  <Icon name="chevD" size={15} className="shrink-0 text-muted" />
                </div>
                <div className="text-[11.5px] text-muted">{vi ? "Chạm để đổi bot" : "Switch bot"}</div>
              </div>
            </button>
          </div>
          {botMenu ? (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setBotMenu(false)} />
              <div className="absolute left-3.5 right-3.5 top-[52px] z-40 rounded-[14px] border border-border bg-surface p-1.5 shadow-2xl">
                {accounts.map((a) => (
                  <button key={a.id} onClick={() => { setBotMenu(false); onSwitch(a.id); }} className={`flex w-full items-center gap-2.5 rounded-[10px] p-[9px_10px] text-left ${a.id === account.id ? "bg-accent-dim" : "hover:bg-surface-2"}`}>
                    <Avatar spec={a.avatar} size={32} status={a.status} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{a.name}</div>
                      <div className="mt-0.5"><StatusPill status={a.status} /></div>
                    </div>
                    {a.id === account.id ? <Icon name="check" size={16} className="text-accent" /> : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <SearchBox className="mb-2.5" value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} placeholder={vi ? "Tìm hội thoại…" : "Search chats…"} />
          <div className="inline-flex w-full gap-0.5 rounded-[10px] border border-border bg-surface-2 p-[3px]">
            {(["all", "direct", "group"] as const).map((k) => (
              <button key={k} onClick={() => setFilter(k)} className={`flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium ${filter === k ? "bg-surface-3 text-text" : "text-muted"}`}>
                {k === "all" ? (vi ? "Hội thoại" : "All") : k === "direct" ? (vi ? "Cá nhân" : "Direct") : (vi ? "Nhóm" : "Groups")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {filtered.map((c) => (
            <ConvoRow key={c.id} convo={c} active={c.id === active?.id} onClick={() => selectConversation(c.id)} />
          ))}
          {filtered.length === 0 ? <div className="p-10 text-center text-[12.5px] italic text-muted">{vi ? "Không có hội thoại." : "No chats."}</div> : null}
        </div>
      </div>

      <ChatThread key={active?.id ?? "empty"} convo={active} messages={messages} expired={expired} vi={vi} onSendText={sendText} onSendImage={sendImage} onSendFile={sendFile} />
      {active ? <ChatInfoPanel account={account} convo={active} vi={vi} /> : <div className="border-l border-border bg-surface-0" />}
    </div>
  );
}

function ConvoRow({ convo, active, onClick }: { readonly convo: Conversation; readonly active: boolean; readonly onClick: () => void }): JSX.Element {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl p-[10px_11px] text-left ${active ? "bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)]" : "hover:bg-surface-2"}`}>
      <div className="relative">
        <Avatar spec={{ hue: convo.hue, initials: convo.initials, img: convo.avatarImg }} size={42} status={convo.type === "direct" ? (convo.online ? "online" : "offline") : undefined} />
        {convo.type === "group" ? <span className="absolute -bottom-0.5 -right-0.5 rounded-md border border-border bg-surface-2 p-0.5 text-muted"><Icon name="users" size={11} /></span> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="flex-1 truncate text-[13.5px] font-semibold">{convo.name}</span>
          <span className="shrink-0 text-[11px] text-muted">{convo.time}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className={`flex-1 truncate text-[12.5px] ${convo.unread ? "text-text" : "text-muted"}`}>{convo.last}</span>
          {convo.auto ? <Icon name="bot" size={13} className="shrink-0 text-accent" /> : null}
          {convo.unread > 0 ? <span className="grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1.5 text-[10.5px] font-semibold text-[#06140c]">{convo.unread}</span> : null}
        </div>
      </div>
    </button>
  );
}

function ChatThread({ convo, messages, expired, vi, onSendText, onSendImage, onSendFile }: {
  readonly convo: Conversation | undefined; readonly messages: ReadonlyArray<Message>;
  readonly expired: boolean; readonly vi: boolean;
  readonly onSendText: (t: string) => void; readonly onSendImage: (f: File, caption?: string) => void; readonly onSendFile: (f: File) => void;
}): JSX.Element {
  const [draft, setDraft] = useState("");
  const [auto, setAuto] = useState(Boolean(convo?.auto));
  const [search, setSearch] = useState("");
  const [searchOn, setSearchOn] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    return searchOn && search.trim()
      ? messages.filter((m) => (m.text ?? m.fileName ?? "").toLowerCase().includes(search.trim().toLowerCase()))
      : messages;
  }, [searchOn, search, messages]);

  useEffect(() => {
    // Clear preview when conversation changes
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  }, [convo?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const scroll = () => {
        container.scrollTop = container.scrollHeight;
      };
      scroll();
      requestAnimationFrame(scroll);
      const timer = setTimeout(scroll, 50);
      return () => clearTimeout(timer);
    }
  }, [shown]);

  if (!convo) return <div className="grid place-items-center bg-chat text-muted">—</div>;
  
  const send = (): void => {
    if (selectedImage) {
      onSendImage(selectedImage, draft);
      setSelectedImage(null);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      setDraft("");
    } else {
      const trimmed = draft.trim();
      if (trimmed) {
        onSendText(trimmed);
        setDraft("");
      }
    }
  };

  return (
    <div className="relative flex min-h-0 flex-col bg-chat">
      <div className="flex items-center gap-3 border-b border-border bg-surface-0 p-[13px_20px]">
        <Avatar spec={{ hue: convo.hue, initials: convo.initials, img: convo.avatarImg }} size={38} status={convo.type === "direct" ? (convo.online ? "online" : "offline") : undefined} />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold">{convo.name}</div>
          <div className="text-[11.5px] text-muted">{convo.type === "group" ? `${convo.members} ${vi ? "thành viên" : "members"}` : convo.online ? (vi ? "Đang hoạt động" : "Online") : (vi ? "Ngoại tuyến" : "Offline")}</div>
        </div>
        <div className="flex items-center gap-2.5 rounded-[9px] border border-border p-[6px_11px]" style={{ background: auto && !expired ? "var(--accent-dim)" : "var(--surface-3)", opacity: expired ? 0.5 : 1, pointerEvents: expired ? "none" : "auto" }}>
          <Icon name="bot" size={15} className={auto && !expired ? "text-accent" : "text-muted"} />
          <span className={`text-xs font-semibold ${auto && !expired ? "text-accent" : "text-muted"}`}>{vi ? "Tự trả lời" : "Auto"}</span>
          <Toggle on={auto && !expired} onChange={setAuto} />
        </div>
        <button onClick={() => setSearchOn((v) => !v)} className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border ${searchOn ? "bg-accent-dim text-accent" : "text-muted hover:text-text"}`}><Icon name="search" size={16} /></button>
      </div>

      {searchOn ? (
        <div className="flex items-center gap-2.5 border-b border-border bg-surface-0 p-[10px_18px]">
          <SearchBox className="flex-1" value={search} autoFocus onChange={(e) => setSearch(e.target.value)} placeholder={vi ? "Tìm trong hội thoại…" : "Search…"} />
          <span className="whitespace-nowrap text-xs text-muted">{search.trim() ? `${shown.length} ${vi ? "kết quả" : "results"}` : ""}</span>
          <button onClick={() => { setSearchOn(false); setSearch(""); }} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border text-muted"><Icon name="x" size={15} /></button>
        </div>
      ) : null}

      {expired ? (
        <div className="flex items-center gap-3 border-b border-[rgba(217,104,95,.24)] bg-[rgba(217,104,95,.1)] p-[12px_18px]">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[rgba(217,104,95,.16)] text-danger"><Icon name="alert" size={18} /></span>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-danger">{vi ? "Bot đã mất phiên đăng nhập Zalo" : "Session expired"}</div>
            <div className="mt-px text-xs text-muted">{vi ? "Chỉ xem được tin nhắn. Đăng nhập lại để gửi tin." : "View only. Re-login to send."}</div>
          </div>
        </div>
      ) : null}

      <div ref={scrollRef} className="flex flex-1 flex-col gap-1 overflow-y-auto p-[22px_24px] no-scrollbar">
        <div className="mb-3.5 text-center"><span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] text-muted">{vi ? "Hôm nay" : "Today"}</span></div>
        {shown.map((m, i) => <Bubble key={m.id} message={m} prev={shown[i - 1]} vi={vi} highlight={searchOn ? search.trim() : ""} />)}
      </div>

      {expired ? (
        <div className="flex items-center justify-center gap-2.5 border-t border-border bg-surface-0 p-[16px_18px] text-[12.5px] text-muted">
          <Icon name="alert" size={15} className="text-danger" /> {vi ? "Không thể gửi tin khi mất phiên đăng nhập" : "Can't send — session expired"}
        </div>
      ) : (
        <div className="border-t border-border bg-surface-0">
          {imagePreviewUrl ? (
            <div className="flex items-center gap-3 border-b border-border bg-surface-2 p-[10px_18px]">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
                <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                    setImagePreviewUrl(null);
                  }}
                  className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-danger/80 text-white hover:bg-danger shadow-md transition-colors"
                >
                  <Icon name="x" size={9} />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{selectedImage?.name}</div>
                <div className="text-[10px] text-muted">
                  {selectedImage ? `${(selectedImage.size / 1024).toFixed(1)} KB` : ""}
                </div>
              </div>
            </div>
          ) : null}
          <div className="p-[12px_18px_16px]">
            {auto ? <div className="mb-2.5 flex items-center gap-2 text-[11.5px] text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> {vi ? "AI đang tự trả lời · nhập để tiếp quản" : "AI is replying · type to take over"}</div> : null}
            <div className="flex items-center gap-2">
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSelectedImage(f); setImagePreviewUrl(URL.createObjectURL(f)); } e.target.value = ""; }} />
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSendFile(f); e.target.value = ""; }} />
              <button onClick={() => imgRef.current?.click()} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border text-muted hover:text-text"><Icon name="image" size={18} /></button>
              <button onClick={() => fileRef.current?.click()} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border text-muted hover:text-text"><Icon name="paperclip" size={18} /></button>
              <div className="flex flex-1 items-center rounded-xl border border-border bg-surface-2 p-[4px_6px_4px_14px]">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={vi ? "Nhập tin nhắn…" : "Type a message…"} className="flex-1 bg-transparent py-2 text-sm text-text outline-none" />
              </div>
              <Button icon="send" onClick={send} className="rounded-xl px-4 py-2.5">{vi ? "Gửi" : "Send"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ message, prev, vi, highlight }: { readonly message: Message; readonly prev: Message | undefined; readonly vi: boolean; readonly highlight: string }): JSX.Element {
  const mine = message.from === "me" || message.from === "ai";
  const isAI = message.from === "ai";
  const showWho = message.who && (!prev || prev.who !== message.who);
  const cls = isAI ? "bubble-ai" : mine ? "bubble-me" : "bubble-them";
  const time = message.time === "now" ? (vi ? "vừa xong" : "now") : message.time;

  return (
    <div className={`mt-2 flex flex-col ${mine ? "items-end" : "items-start"} animate-message`}>
      {showWho ? <span className="m-[2px_4px_4px] text-[11px] text-muted">{message.who}</span> : null}
      {isAI ? <div className="m-[0_4px_5px] flex items-center gap-1.5 text-[10.5px] font-semibold text-accent"><Icon name="bot" size={12} /> {vi ? "AI tự gửi" : "Sent by AI"}</div> : null}
      <div className={`${cls} max-w-[76%] rounded-[17px] p-[10px_14px] text-[13.5px] leading-relaxed`} style={message.kind === "image" || message.kind === "video" ? { padding: 4 } : undefined}>
        {message.kind === "image" ? (
          <img src={message.img} alt="" className="block w-[248px] max-w-full rounded-xl object-cover" />
        ) : message.kind === "video" ? (
          <video src={message.videoUrl} controls className="block w-[320px] max-w-full rounded-xl object-cover" />
        ) : message.kind === "file" ? (
          <div className="flex items-center gap-3">
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[9px] bg-black/15"><Icon name="doc" size={19} /></span>
            <div className="min-w-0">
              <div className="max-w-[180px] truncate text-[13px] font-semibold">{message.fileName}</div>
              <div className="text-[11px] opacity-70">{message.fileSize}</div>
            </div>
            <Icon name="download" size={16} className="opacity-70" />
          </div>
        ) : (
          <Highlighted text={message.text ?? ""} q={highlight} />
        )}
        <div className="mt-1 text-right text-[10px] opacity-70">{time}</div>
      </div>
    </div>
  );
}

function Highlighted({ text, q }: { readonly text: string; readonly q: string }): JSX.Element {
  const rendered = text.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>));
  if (!q) return <>{rendered}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{rendered}</>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-accent px-0.5 text-[#0a1f16]">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}
