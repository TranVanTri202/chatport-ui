"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Account, Conversation, Message } from "@/types";
import { useAccounts } from "@/hooks/useAccounts";
import { useChat } from "@/hooks/useChat";
import { usePreferences } from "@/hooks/usePreferences";
import { useAppContext } from "@/providers/AppProvider";
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
  const { socket } = useAppContext();
  const { conversations, active, messages, selectConversation, sendText, sendImage, sendFile, reactToMessage, recallMessage, sendTypingStatus, pinMessage, unpinMessage } = useChat(account.convos, initialConvoId);
  const [filter, setFilter] = useState<"all" | "direct" | "group">("all");
  const [query, setQuery] = useState("");
  const [botMenu, setBotMenu] = useState(false);
  const [presenceByConvoId, setPresenceByConvoId] = useState<Record<string, { readonly online: boolean; readonly presenceText?: string }>>({});
  const pendingPresenceRef = useRef<Set<string>>(new Set());
  const expired = account.status === "expired";

  const filtered = useMemo(
    () => conversations.map((c) => ({ ...c, ...presenceByConvoId[c.id] })).filter((c) => {
      const okType = filter === "all" || c.type === filter;
      const q = query.trim().toLowerCase();
      return okType && (!q || `${c.name} ${c.last}`.toLowerCase().includes(q));
    }),
    [conversations, filter, query, presenceByConvoId],
  );

  const convo = useMemo(() => filtered.find((c) => c.id === active?.id), [filtered, active]);

  useEffect(() => {
    if (!socket || !active || active.type !== "direct" || !active.phone) return;

    const convoId = active.id;
    if (pendingPresenceRef.current.has(convoId)) return;

    pendingPresenceRef.current.add(convoId);
    socket.emit("user:lastOnline:request", {
      botExternalId: account.phone,
      convoId,
      uid: active.phone,
    });
  }, [socket, active, account.phone]);

  useEffect(() => {
    if (!socket) return undefined;

    const handlePresence = (payload: { readonly convoId?: string; readonly uid?: string; readonly online?: boolean; readonly lastOnline?: number; readonly presenceText?: string }) => {
      const convoId = payload.convoId ?? filtered.find((c) => c.phone === payload.uid)?.id;
      if (!convoId) return;

      pendingPresenceRef.current.delete(convoId);
      const presenceText = payload.online ? undefined : payload.presenceText ?? (payload.lastOnline ? "Ngoại tuyến" : undefined);
      setPresenceByConvoId((prev) => ({
        ...prev,
        [convoId]: {
          online: Boolean(payload.online),
          presenceText,
        },
      }));
    };

    socket.on("user:lastOnline:response", handlePresence);
    return () => {
      socket.off("user:lastOnline:response", handlePresence);
    };
  }, [socket, filtered]);

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

      <ChatThread key={convo?.id ?? "empty"} convo={convo} messages={messages} expired={expired} vi={vi} onSendText={sendText} onSendImage={sendImage} onSendFile={sendFile} onReactToMessage={reactToMessage} onRecallMessage={recallMessage} onSendTypingStatus={sendTypingStatus} onPinMessage={pinMessage} onUnpinMessage={unpinMessage} />
      {convo ? <ChatInfoPanel account={account} convo={convo} vi={vi} /> : <div className="border-l border-border bg-surface-0" />}
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

function ChatThread({ convo, messages, expired, vi, onSendText, onSendImage, onSendFile, onReactToMessage, onRecallMessage, onSendTypingStatus, onPinMessage, onUnpinMessage }: {
  readonly convo: Conversation | undefined; readonly messages: ReadonlyArray<Message>;
  readonly expired: boolean; readonly vi: boolean;
  readonly onSendText: (t: string) => void; readonly onSendImage: (f: File, caption?: string) => void; readonly onSendFile: (f: File) => void;
  readonly onReactToMessage: (messageExternalId: string, reactIcon: string) => Promise<void>;
  readonly onRecallMessage: (messageExternalId: string) => Promise<void>;
  readonly onSendTypingStatus: (isTyping: boolean) => void;
  readonly onPinMessage: (messageExternalId: string) => Promise<void>;
  readonly onUnpinMessage: (topicId: string) => Promise<void>;
}): JSX.Element {
  void onUnpinMessage;
  const [draft, setDraft] = useState("");
  const [auto, setAuto] = useState(Boolean(convo?.auto));
  const [search, setSearch] = useState("");
  const [searchOn, setSearchOn] = useState(false);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
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
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handleInputChange = (val: string) => {
    setDraft(val);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onSendTypingStatus(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onSendTypingStatus(false);
    }, 2000);
  };

  const send = (): void => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onSendTypingStatus(false);
    }

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
          <div className="text-[11.5px] text-muted">{convo.type === "group" ? `${convo.members} ${vi ? "thành viên" : "members"}` : convo.online ? (vi ? "Đang hoạt động" : "Online") : (convo.presenceText ?? (vi ? "Ngoại tuyến" : "Offline"))}</div>
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

      {/* Pinned messages banner */}
      {(() => {
        const pinned = (convo as any)?.pinnedMessages || [];
        if (pinned.length === 0) return null;
        return (
          <div className="border-b border-border bg-surface-1">
            {/* Collapsed header / Single pin banner */}
            <div className="flex items-center justify-between p-[8px_16px] text-xs select-none">
              <div 
                className="flex flex-1 items-center min-w-0 cursor-pointer" 
                onClick={() => pinned.length > 1 && setPinnedExpanded(!pinnedExpanded)}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-accent shrink-0 mr-2">
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.12-2.65A2 2 0 0 1 16 10.11V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v5.11a2 2 0 0 1-.44 1.24L5.44 14a2 2 0 0 0-.44 1.24z" />
                </svg>
                <div className="min-w-0 flex-1">
                  {pinned.length === 1 ? (
                    <div className="truncate text-muted">
                      <span className="font-semibold text-text mr-1">{vi ? "Tin ghim:" : "Pinned:"}</span>
                      {pinned[0].params?.title || (vi ? "Bảng tin nhóm" : "Board note")}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-semibold text-text">
                      <span>{vi ? `Tin ghim (${pinned.length})` : `Pinned messages (${pinned.length})`}</span>
                      <Icon name="chevD" size={12} className={`text-muted transition-transform duration-200 ${pinnedExpanded ? "rotate-180" : ""}`} />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0 ml-2">
              </div>
            </div>

            {/* Expanded view for multiple pinned messages */}
            {pinnedExpanded && pinned.length > 1 && (
              <div className="border-t border-border bg-surface-0 divide-y divide-border max-h-[160px] overflow-y-auto no-scrollbar">
                {pinned.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-[8px_16px] hover:bg-surface-2 transition-colors text-xs">
                    <div className="min-w-0 flex-1 truncate text-muted mr-3">
                      <span className="font-semibold text-text mr-1">
                        {item.params?.senderName ? `${item.params.senderName}:` : (vi ? "Tin nhắn:" : "Message:")}
                      </span>
                      {item.params?.title || (vi ? "Bảng tin nhóm" : "Board note")}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div ref={scrollRef} className="flex flex-1 flex-col gap-1 overflow-y-auto p-[22px_24px] no-scrollbar">
        <div className="mb-3.5 text-center"><span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] text-muted">{vi ? "Hôm nay" : "Today"}</span></div>
        {shown.map((m, i) => {
          if (m.kind === "event") {
            const text = m.text || "";
            let prefix = text;
            let boldPart = "";
            const pinPatternVi = "đã ghim tin nhắn ";
            const pinPatternEn = "pinned message ";
            const unpinPatternVi = "đã bỏ ghim tin nhắn ";
            const unpinPatternEn = "unpinned message ";

            if (text.includes(unpinPatternVi)) {
              const idx = text.indexOf(unpinPatternVi);
              prefix = text.substring(0, idx + unpinPatternVi.length);
              boldPart = text.substring(idx + unpinPatternVi.length);
            } else if (text.includes(unpinPatternEn)) {
              const idx = text.indexOf(unpinPatternEn);
              prefix = text.substring(0, idx + unpinPatternEn.length);
              boldPart = text.substring(idx + unpinPatternEn.length);
            } else if (text.includes(pinPatternVi)) {
              const idx = text.indexOf(pinPatternVi);
              prefix = text.substring(0, idx + pinPatternVi.length);
              boldPart = text.substring(idx + pinPatternVi.length);
            } else if (text.includes(pinPatternEn)) {
              const idx = text.indexOf(pinPatternEn);
              prefix = text.substring(0, idx + pinPatternEn.length);
              boldPart = text.substring(idx + pinPatternEn.length);
            }

            return (
              <div key={m.id} className="flex items-center justify-center my-2 select-none animate-fade-in w-full">
                <div 
                  className="inline-flex items-center shadow-sm rounded-full py-1.5 px-4 text-[12px] max-w-[90%]"
                  style={{
                    backgroundColor: "var(--bubble-them-bg)",
                    color: "var(--bubble-them-text)",
                  }}
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0 rotate-[45deg]">
                    <line x1="12" y1="17" x2="12" y2="22" />
                    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.12-2.65A2 2 0 0 1 16 10.11V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v5.11a2 2 0 0 1-.44 1.24L5.44 14a2 2 0 0 0-.44 1.24z" />
                  </svg>
                  <span>
                    {prefix}
                    {boldPart && <span className="font-bold">{boldPart}</span>}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <Bubble
              key={m.id}
              message={m}
              prev={shown[i - 1]}
              vi={vi}
              highlight={searchOn ? search.trim() : ""}
              onReact={onReactToMessage}
              onRecall={onRecallMessage}
              onPin={onPinMessage}
            />
          );
        })}
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
                <input value={draft} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={vi ? "Nhập tin nhắn…" : "Type a message…"} className="flex-1 bg-transparent py-2 text-sm text-text outline-none" />
              </div>
              <Button icon="send" onClick={send} className="rounded-xl px-4 py-2.5">{vi ? "Gửi" : "Send"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ message, prev, vi, highlight, onReact, onRecall, onPin }: { readonly message: Message; readonly prev: Message | undefined; readonly vi: boolean; readonly highlight: string; readonly onReact: (messageExternalId: string, reactIcon: string) => Promise<void>; readonly onRecall: (messageExternalId: string) => Promise<void>; readonly onPin: (messageExternalId: string) => Promise<void> }): JSX.Element {
  void onPin;
  const mine = message.from === "me" || message.from === "ai";
  const isAI = message.from === "ai";
  const showWho = message.who && (!prev || prev.who !== message.who);
  const cls = isAI ? "bubble-ai" : mine ? "bubble-me" : "bubble-them";
  const time = message.time === "now" ? (vi ? "vừa xong" : "now") : message.time;
  const [showPicker, setShowPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showRecalledContent, setShowRecalledContent] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (message.isRecalled && !showRecalledContent) return;
    e.preventDefault();
    const menuWidth = 180;
    let x = e.clientX;
    if (x + menuWidth > window.innerWidth) {
      x = Math.max(10, window.innerWidth - menuWidth - 10);
    }
    setContextMenu({ x, y: e.clientY });
  };

  const fallbackCopyText = (text: string) => {
    void text;
    console.warn("Clipboard API unavailable in this browser context.");
  };

  const handleCopy = () => {
    if (message.text) {
      const textToCopy = message.text;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy)
          .catch((err) => {
            console.warn("Clipboard API failed, using fallback:", err);
            fallbackCopyText(textToCopy);
          });
      } else {
        fallbackCopyText(textToCopy);
      }
    }
    setContextMenu(null);
  };

  const handleRecallClick = () => {
    if (confirm(vi ? "Bạn có chắc chắn muốn thu hồi tin nhắn này?" : "Are you sure you want to recall this message?")) {
      void onRecall(message.messageExternalId || "");
    }
    setContextMenu(null);
  };


  return (
    <div className={`mt-2 flex flex-col ${mine ? "items-end" : "items-start"} animate-message group/bubble relative`}>
      {showWho ? <span className="m-[2px_4px_4px] text-[11px] text-muted">{message.who}</span> : null}
      {isAI ? <div className="m-[0_4px_5px] flex items-center gap-1.5 text-[10.5px] font-semibold text-accent"><Icon name="bot" size={12} /> {vi ? "AI tự gửi" : "Sent by AI"}</div> : null}
      
      <div className="flex items-center gap-2 max-w-[76%] relative">
        {mine && !message.isRecalled && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const menuWidth = 180;
                let x = e.clientX;
                if (x + menuWidth > window.innerWidth) {
                  x = Math.max(10, window.innerWidth - menuWidth - 10);
                }
                setContextMenu({
                  x,
                  y: e.clientY
                });
              }}
              className="opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface-2 hover:bg-surface-3 text-muted cursor-pointer shadow-sm"
              title={vi ? "Thêm" : "More"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>
            <ReactionTrigger
              message={message}
              onReact={onReact}
              showPicker={showPicker}
              setShowPicker={setShowPicker}
              mine={mine}
            />
          </div>
        )}
        
        <div
          onContextMenu={handleContextMenu}
          className={`${cls} flex-1 rounded-[17px] p-[10px_14px] text-[13.5px] leading-relaxed relative cursor-pointer select-text`}
          style={(!message.isRecalled || (showRecalledContent && (message.kind === "image" || message.kind === "video"))) ? (message.kind === "image" || message.kind === "video" ? { padding: 4 } : undefined) : undefined}
        >
          {message.isRecalled ? (
            <div className="flex flex-col gap-1.5 min-w-[175px]">
              <div className="flex items-center justify-between gap-4">
                <span className="italic opacity-60 flex items-center gap-1.5 select-none text-[12.5px]">
                  <Icon name="alert" size={13} />
                  {vi ? "Tin nhắn đã thu hồi" : "Message recalled"}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowRecalledContent(!showRecalledContent);
                  }}
                  className="text-accent hover:underline font-bold text-[11px] not-italic select-none cursor-pointer"
                >
                  {showRecalledContent ? (vi ? "Ẩn" : "Xem") : (vi ? "Xem lại" : "Review")}
                </button>
              </div>

              {showRecalledContent && (
                <div className="mt-1 pt-1.5 border-t border-dashed border-text/10 opacity-75">
                  {message.kind === "image" ? (
                    <img src={message.img} alt="" className="block w-[248px] max-w-full rounded-xl object-cover animate-fade-in" />
                  ) : message.kind === "video" ? (
                    <video src={message.videoUrl} controls className="block w-[320px] max-w-full rounded-xl object-cover animate-fade-in" />
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
                </div>
              )}
            </div>
          ) : message.kind === "image" ? (
            <img src={message.img} alt="" className="block w-[248px] max-w-full rounded-xl object-cover animate-fade-in" />
          ) : message.kind === "video" ? (
            <video src={message.videoUrl} controls className="block w-[320px] max-w-full rounded-xl object-cover animate-fade-in" />
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
          <div className="mt-1 text-right text-[10px] opacity-70 select-none">{time}</div>

          {!message.isRecalled && message.reactions && message.reactions.length > 0 && (
            <div className={`absolute -bottom-2.5 ${mine ? 'right-4' : 'left-4'} flex items-center gap-1 bg-surface-2 border border-border rounded-full px-1.5 py-0.5 shadow-md text-xs select-none backdrop-blur-sm z-10 hover:bg-surface-3 transition-colors cursor-pointer`}>
              {Array.from(new Set(message.reactions.map(r => r.reaction))).map(emoji => {
                const count = message.reactions!.filter(r => r.reaction === emoji).length;
                const names = message.reactions!.filter(r => r.reaction === emoji).map(r => r.userName).join(", ");
                return (
                  <span key={emoji} className="flex items-center gap-0.5" title={names}>
                    <span>{emoji}</span>
                    {count > 1 && <span className="text-[9px] text-muted font-bold">{count}</span>}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {!mine && !message.isRecalled && (
          <div className="flex items-center gap-1.5">
            <ReactionTrigger
              message={message}
              onReact={onReact}
              showPicker={showPicker}
              setShowPicker={setShowPicker}
              mine={mine}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const menuWidth = 180;
                let x = e.clientX;
                if (x + menuWidth > window.innerWidth) {
                  x = Math.max(10, window.innerWidth - menuWidth - 10);
                }
                setContextMenu({
                  x,
                  y: e.clientY
                });
              }}
              className="opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface-2 hover:bg-surface-3 text-muted cursor-pointer shadow-sm"
              title={vi ? "Thêm" : "More"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {contextMenu && typeof document !== "undefined" && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9999] cursor-default"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-[10000] w-[180px] rounded-lg border border-border bg-surface shadow-2xl p-1 text-[12.5px] font-medium text-text flex flex-col gap-0.5 cursor-default select-none animate-pop-in"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setContextMenu(null)} className="flex items-center gap-2.5 w-full text-left rounded-md px-2 py-1.5 hover:bg-surface-2 transition-colors">
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span>{vi ? "Trả lời" : "Reply"}</span>
            </button>
            
            <button onClick={() => setContextMenu(null)} className="flex items-center gap-2.5 w-full text-left rounded-md px-2 py-1.5 hover:bg-surface-2 transition-colors">
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.61 2.305m0 0l4.61-2.305m-4.61 2.305a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm0 0a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0 0a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
              </svg>
              <span>{vi ? "Chia sẻ" : "Share"}</span>
            </button>

            {message.text && (
              <button onClick={handleCopy} className="flex items-center gap-2.5 w-full text-left rounded-md px-2 py-1.5 hover:bg-surface-2 transition-colors">
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 11.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                <span>{vi ? "Copy tin nhắn" : "Copy"}</span>
              </button>
            )}



            <button onClick={() => setContextMenu(null)} className="flex items-center gap-2.5 w-full text-left rounded-md px-2 py-1.5 hover:bg-surface-2 transition-colors">
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.783-.57-.38-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
              </svg>
              <span>{vi ? "Đánh dấu tin nhắn" : "Star"}</span>
            </button>

            <div className="h-px bg-border my-1" />

            {mine && !message.isRecalled && (
              <button onClick={handleRecallClick} className="flex items-center gap-2.5 w-full text-left rounded-md px-2 py-1.5 text-danger hover:bg-danger/10 transition-colors">
                <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="font-semibold">{vi ? "Thu hồi" : "Recall"}</span>
              </button>
            )}
          </div>
        </>,
        document.body
      )}
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

const REACTION_LIST = [
  { icon: "/-heart", emoji: "❤️" },
  { icon: "/-strong", emoji: "👍" },
  { icon: ":>", emoji: "😂" },
  { icon: ":o", emoji: "😮" },
  { icon: ":-((", emoji: "😢" },
  { icon: ":-h", emoji: "😡" },
];

function ReactionTrigger({
  message,
  onReact,
  showPicker,
  setShowPicker,
  mine,
}: {
  readonly message: Message;
  readonly onReact: (messageExternalId: string, reactIcon: string) => Promise<void>;
  readonly showPicker: boolean;
  readonly setShowPicker: (val: boolean) => void;
  readonly mine: boolean;
}): JSX.Element {
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200 grid h-6 w-6 place-items-center rounded-full border border-border bg-surface-2 hover:bg-surface-3 text-muted hover:text-text cursor-pointer shadow-sm"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className={`absolute bottom-full ${mine ? 'right-0' : 'left-0'} mb-2 z-50 flex items-center gap-1.5 bg-surface-3 border border-border shadow-2xl rounded-full p-1.5 animate-pop-in`}>
            {REACTION_LIST.map(({ icon, emoji }) => (
              <button
                key={icon}
                onClick={() => {
                  void onReact(message.messageExternalId || "", icon);
                  setShowPicker(false);
                }}
                className="text-[17px] hover:scale-130 transition-transform duration-150 p-1 cursor-pointer select-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
