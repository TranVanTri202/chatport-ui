"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Account, Conversation, Message } from "@/types";
import { useAccounts } from "@/hooks/useAccounts";
import { useChat } from "@/hooks/useChat";
import { usePreferences } from "@/hooks/usePreferences";
import { useContacts } from "@/hooks/useContacts";
import { useAppContext } from "@/providers/AppProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SearchBox } from "@/components/ui/SearchBox";
import { StatusPill } from "@/components/ui/StatusPill";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { ChatInfoPanel } from "./ChatInfoPanel";
import { api } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";

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
  const { showToast } = useToast();
  const { socket } = useAppContext();
  const { conversations, active, messages, selectConversation, sendText, sendImage, sendFile, sendVoice, sendVideo, reactToMessage, recallMessage, sendTypingStatus, pinMessage, unpinMessage, toggleMute, sendSticker } = useChat(account.convos, initialConvoId);

  const { friends, requests, sentRequests, accept, decline, cancelSent, remove, sendRequest, changeAlias, removeAlias } = useContacts(account.phone);
  const [profileModal, setProfileModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [unfriendConfirm, setUnfriendConfirm] = useState(false);
  const [aliasModal, setAliasModal] = useState(false);
  const [aliasDraft, setAliasDraft] = useState("");

  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createGroupSearch, setCreateGroupSearch] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState<string | null>(null);
  const [newGroupAvatarPreview, setNewGroupAvatarPreview] = useState<string | null>(null);
  const createGroupFileRef = useRef<HTMLInputElement>(null);

  const [forwardModal, setForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardSelected, setForwardSelected] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const [forwardTab, setForwardTab] = useState<"recent" | "groups" | "friends">("recent");
  const [forwardNote, setForwardNote] = useState("");

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (forwardTab === "groups" && c.type !== "group") return false;
      if (forwardTab === "friends" && c.type !== "direct") return false;
      const q = forwardSearch.trim().toLowerCase();
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
    });
  }, [conversations, forwardTab, forwardSearch]);

  const handleForwardSubmit = async () => {
    if (!messageToForward || forwardSelected.length === 0) return;
    setForwarding(true);
    try {
      const selectedConvos = conversations.filter((c) => forwardSelected.includes(c.id));
      await Promise.all(
        selectedConvos.map(async (c) => {
          // 1. Forward the message
          await api.post("/messages/forward", {
            botExternalId: account.phone,
            messageExternalId: messageToForward.messageExternalId,
            targetThreadId: c.phone,
            targetThreadType: c.type === "group" ? "group" : "user",
          });

          // 2. Send the optional extra note
          if (forwardNote.trim()) {
            await api.post("/messages/send/text", {
              botExternalId: account.phone,
              threadId: c.phone,
              threadType: c.type === "group" ? "group" : "user",
              text: forwardNote.trim(),
            });
          }
        })
      );
      setForwardModal(false);
      setMessageToForward(null);
      setForwardSearch("");
      setForwardSelected([]);
      setForwardNote("");
      setForwardTab("recent");
      showToast(vi ? "Đã chia sẻ tin nhắn thành công!" : "Successfully shared message!", "success");
    } catch (err) {
      console.error("Failed to forward message:", err);
      showToast(vi ? `Lỗi chia sẻ: ${(err as Error).message}` : `Failed to share message: ${(err as Error).message}`, "error");
    } finally {
      setForwarding(false);
    }
  };

  const handleNewGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const dataUrl = `data:${f.type};name=${encodeURIComponent(f.name)};base64,${base64.split(",")[1]}`;
      setNewGroupAvatar(dataUrl);
      setNewGroupAvatarPreview(URL.createObjectURL(f));
    };
    reader.readAsDataURL(f);
  };

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    if (selectedFriends.length === 0) return;
    setCreatingGroup(true);
    try {
      const res = await api.post<{ id: number; title: string }>(
        `/bots/zalo/${account.phone}/conversations/groups`,
        {
          name: trimmed,
          members: selectedFriends,
          ...(newGroupAvatar ? { avatar: newGroupAvatar } : {}),
        }
      );
      setCreateGroupModal(false);
      setNewGroupName("");
      setSelectedFriends([]);
      setCreateGroupSearch("");
      setNewGroupAvatar(null);
      setNewGroupAvatarPreview(null);
      showToast(vi ? "Đã tạo nhóm thành công!" : "Successfully created group!", "success");
      selectConversation(String(res.id));
    } catch (err) {
      console.error("Failed to create group:", err);
      showToast(vi ? `Lỗi tạo nhóm: ${(err as Error).message}` : `Failed to create group: ${(err as Error).message}`, "error");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSendFile = useCallback((file: File) => {
    if (file.type.startsWith("video/")) {
      sendVideo(file);
    } else if (file.type.startsWith("audio/")) {
      sendVoice(file);
    } else {
      sendFile(file);
    }
  }, [sendFile, sendVoice, sendVideo]);
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

  const isDirect = convo?.type === "direct";
  const friendId = convo?.phone;

  const isFriend = useMemo(() => {
    if (!isDirect || !friendId) return false;
    return friends.some((f) => f.id === friendId);
  }, [isDirect, friendId, friends]);

  const isSentRequest = useMemo(() => {
    if (!isDirect || !friendId) return false;
    return sentRequests.some((r) => r.id === friendId);
  }, [isDirect, friendId, sentRequests]);

  const isReceivedRequest = useMemo(() => {
    if (!isDirect || !friendId) return false;
    return requests.some((r) => r.externalId === friendId);
  }, [isDirect, friendId, requests]);

  const matchingRequest = useMemo(() => {
    if (!isDirect || !friendId) return undefined;
    return requests.find((r) => r.externalId === friendId);
  }, [isDirect, friendId, requests]);

  const matchingFriend = useMemo(() => {
    if (!isDirect || !friendId) return undefined;
    return friends.find((f) => f.id === friendId);
  }, [isDirect, friendId, friends]);

  const handleAddFriend = useCallback(async () => {
    if (!friendId) return;
    await sendRequest(friendId, vi ? "Xin chào, kết bạn nhé!" : "Hello, let's connect!");
  }, [friendId, sendRequest, vi]);

  const handleCancelRequest = useCallback(async () => {
    if (!friendId) return;
    const req = sentRequests.find((r) => r.id === friendId);
    if (req) {
      await cancelSent(req);
    }
  }, [friendId, sentRequests, cancelSent]);

  const handleAcceptRequest = useCallback(async () => {
    if (matchingRequest) {
      await accept(matchingRequest);
    }
  }, [matchingRequest, accept]);

  const handleDeclineRequest = useCallback(async () => {
    if (matchingRequest) {
      await decline(matchingRequest);
    }
  }, [matchingRequest, decline]);

  const handleRemoveFriend = useCallback(async () => {
    if (!friendId) return;
    const friend = friends.find((f) => f.id === friendId);
    if (friend) {
      await remove(friend);
      setUnfriendConfirm(false);
      setProfileModal(false);
    }
  }, [friendId, friends, remove]);

  const handleOpenAliasModal = useCallback(() => {
    setAliasDraft(matchingFriend?.name ?? convo?.name ?? "");
    setAliasModal(true);
  }, [matchingFriend, convo]);

  const handleSaveAlias = useCallback(async () => {
    if (!friendId) return;
    const trimmed = aliasDraft.trim();
    if (trimmed) {
      await changeAlias(friendId, trimmed);
    }
    setAliasModal(false);
  }, [friendId, aliasDraft, changeAlias]);

  const handleRemoveAlias = useCallback(async () => {
    if (!friendId) return;
    await removeAlias(friendId);
    setAliasModal(false);
  }, [friendId, removeAlias]);

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
          <div className="mb-2.5 flex gap-2">
            <SearchBox className="flex-1" value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} placeholder={vi ? "Tìm hội thoại…" : "Search chats…"} />
            <button
              onClick={() => setCreateGroupModal(true)}
              title={vi ? "Tạo nhóm mới" : "Create new group"}
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border border-border bg-surface-2 text-muted hover:text-text hover:border-accent-border transition-colors cursor-pointer"
            >
              <Icon name="users" size={16} />
            </button>
          </div>
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

      <ChatThread
        key={convo?.id ?? "empty"}
        convo={convo}
        messages={messages}
        expired={expired}
        vi={vi}
        botId={account.id}
        onSendText={sendText}
        onSendImage={sendImage}
        onSendFile={handleSendFile}
        onSendSticker={sendSticker}
        onReactToMessage={reactToMessage}
        onRecallMessage={recallMessage}
        onSendTypingStatus={sendTypingStatus}
        onPinMessage={pinMessage}
        onUnpinMessage={unpinMessage}
        isFriend={isFriend}
        isSentRequest={isSentRequest}
        isReceivedRequest={isReceivedRequest}
        onAddFriend={handleAddFriend}
        onCancelRequest={handleCancelRequest}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
        onAvatarClick={() => setProfileModal(true)}
        onForwardClick={(m: Message) => {
          setMessageToForward(m);
          setForwardSelected([]);
          setForwardSearch("");
          setForwarding(false);
          setForwardTab("recent");
          setForwardNote("");
          setForwardModal(true);
        }}
        onToggleMute={(muted) => convo && toggleMute(convo.id, muted)}
      />
      {convo ? <ChatInfoPanel account={account} convo={convo} vi={vi} onToggleMute={(muted) => toggleMute(convo.id, muted)} /> : <div className="border-l border-border bg-surface-0" />}

      {profileModal && convo && convo.type === "direct" && (
        <Modal title={vi ? "Thông tin tài khoản" : "Account Info"} onClose={() => setProfileModal(false)} noPadding width={390}>
          {matchingFriend?.cover ? (
            <button 
              onClick={() => matchingFriend.cover && setLightboxImage(matchingFriend.cover)}
              title={vi ? "Click để xem ảnh bìa lớn" : "Click to view full cover"}
              className="h-[125px] w-full relative overflow-hidden bg-surface-3 cursor-zoom-in hover:brightness-95 active:brightness-90 transition-all outline-none border-none block p-0"
            >
              <img src={matchingFriend.cover} alt="Cover" className="w-full h-full object-cover" />
            </button>
          ) : (
            <div 
              className="h-[125px] w-full relative" 
              style={{
                background: `linear-gradient(135deg, hsl(${convo.hue}, 60%, 25%), hsl(${convo.hue}, 40%, 12%))`
              }}
            />
          )}
          <div className="relative px-5 pb-4 bg-surface">
            <button 
              onClick={() => convo.avatarImg && setLightboxImage(convo.avatarImg)}
              disabled={!convo.avatarImg}
              title={convo.avatarImg ? (vi ? "Click để xem ảnh đại diện lớn" : "Click to view full avatar") : undefined}
              className={`absolute -top-[45px] left-5 border-[3.5px] border-surface bg-surface rounded-full shadow-md overflow-hidden outline-none z-10 ${convo.avatarImg ? "cursor-zoom-in hover:scale-105 active:scale-[0.98] transition-all" : "cursor-default"}`}
            >
              <Avatar spec={{ hue: convo.hue, initials: convo.initials, img: convo.avatarImg }} size={74} />
            </button>
            <div className="pt-10 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[17px] font-bold text-text truncate max-w-[240px]">{convo.name}</h3>
                    {isFriend && (
                      <button
                        onClick={handleOpenAliasModal}
                        className="text-muted hover:text-text p-0.5 transition-colors shrink-0"
                        title={vi ? "Đặt biệt danh" : "Set nickname"}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                    )}
                  </div>
                  {matchingFriend?.zaloName && matchingFriend.zaloName !== convo.name && (
                    <div className="text-[11.5px] text-muted mt-0.5">
                      {vi ? "Tên Zalo: " : "Zalo: "}
                      <span className="text-[#0068ff] font-medium">{matchingFriend.zaloName}</span>
                    </div>
                  )}
                </div>
              </div>
              {matchingFriend?.signature && (
                <div className="mt-1 text-[12px] text-muted italic break-words line-clamp-2">
                  "{matchingFriend.signature}"
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setProfileModal(false)}
              className="mt-4 w-full bg-accent-dim hover:bg-accent/20 text-accent font-semibold py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="chat" size={15} />
              {vi ? "Nhắn tin" : "Message"}
            </button>
          </div>

          <div className="border-t border-border bg-surface p-[14px_20px]">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3">{vi ? "Thông tin cá nhân" : "Personal Info"}</h4>
            <div className="flex flex-col gap-3 text-[13px]">
              <div className="flex justify-between items-center">
                <span className="text-muted">{vi ? "Giới tính" : "Gender"}</span>
                <span className="font-semibold text-text">
                  {matchingFriend?.gender !== undefined 
                    ? (matchingFriend.gender === 0 ? (vi ? "Nam" : "Male") : (vi ? "Nữ" : "Female"))
                    : guessGender(convo.name)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">{vi ? "Ngày sinh" : "Date of birth"}</span>
                <span className="font-semibold text-text">
                  {matchingFriend?.dob ? matchingFriend.dob : "••/••/••••"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">{vi ? "Điện thoại" : "Phone"}</span>
                <span className="font-semibold text-text">
                  {isFriend && matchingFriend?.phone ? matchingFriend.phone : "••••••••••"}
                </span>
              </div>
              {matchingFriend?.zaloName && (
                <div className="flex justify-between items-center">
                  <span className="text-muted">{vi ? "Tên Zalo" : "Zalo Name"}</span>
                  <span className="font-semibold text-[#0068ff]">{matchingFriend.zaloName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border bg-surface p-[14px_20px]">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-2">{vi ? "Hình ảnh" : "Shared Images"}</h4>
            <div className="py-7 flex flex-col items-center justify-center text-center text-muted gap-2 select-none">
              <Icon name="image" size={18} className="text-muted/50" />
              <span className="text-[11.5px]">{vi ? "Chưa có ảnh nào được chia sẻ" : "No shared images"}</span>
            </div>
          </div>

          <div className="border-t border-border bg-surface-0 flex flex-col divide-y divide-border/50">
            <ProfileOptionRow
              icon="users"
              text={vi ? `Nhóm chung (${getMutualGroupsCount(friendId || "")})` : `Mutual groups (${getMutualGroupsCount(friendId || "")})`}
            />
            <ProfileOptionRow
              icon="doc"
              text={vi ? "Chia sẻ danh thiếp" : "Share contact card"}
            />
            <ProfileOptionRow
              icon="eyeOff"
              text={vi ? "Chặn tin nhắn và cuộc gọi" : "Block messages & calls"}
            />
            <ProfileOptionRow
              icon="alert"
              text={vi ? "Báo xấu" : "Report"}
            />
            {isFriend ? (
              <ProfileOptionRow
                icon="trash"
                text={vi ? "Xóa khỏi danh sách bạn bè" : "Xóa khỏi danh sách bạn bè"}
                danger
                onClick={() => setUnfriendConfirm(true)}
              />
            ) : isSentRequest ? (
              <ProfileOptionRow
                icon="x"
                text={vi ? "Thu hồi lời mời kết bạn" : "Cancel friend request"}
                onClick={handleCancelRequest}
              />
            ) : isReceivedRequest ? (
              <>
                <ProfileOptionRow
                  icon="check"
                  text={vi ? "Đồng ý kết bạn" : "Accept friend request"}
                  onClick={handleAcceptRequest}
                />
                <ProfileOptionRow
                  icon="x"
                  text={vi ? "Từ chối kết bạn" : "Decline friend request"}
                  onClick={handleDeclineRequest}
                />
              </>
            ) : (
              <ProfileOptionRow
                icon="userPlus"
                text={vi ? "Kết bạn" : "Add Friend"}
                onClick={handleAddFriend}
              />
            )}
          </div>
        </Modal>
      )}

      {unfriendConfirm && convo && (
        <Modal 
          title={vi ? "Xác nhận hủy kết bạn" : "Confirm Unfriend"} 
          onClose={() => setUnfriendConfirm(false)} 
          width={380}
        >
          <div className="flex flex-col gap-4">
            <div className="text-[13px] text-muted leading-relaxed">
              {vi 
                ? `Bạn có chắc chắn muốn hủy kết bạn với ${convo.name}? Hành động này không thể hoàn tác.`
                : `Are you sure you want to remove ${convo.name} from your friends list? This action cannot be undone.`}
            </div>
            <div className="flex justify-end gap-2.5">
              <Button 
                variant="ghost" 
                onClick={() => setUnfriendConfirm(false)}
              >
                {vi ? "Hủy" : "Cancel"}
              </Button>
              <Button 
                variant="danger" 
                onClick={handleRemoveFriend}
              >
                {vi ? "Đồng ý" : "Confirm"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {aliasModal && convo && isFriend && (
        <Modal
          title={vi ? "Đặt biệt danh" : "Set Nickname"}
          onClose={() => setAliasModal(false)}
          width={360}
        >
          <div className="flex flex-col gap-4">
            <div className="text-[12.5px] text-muted leading-relaxed">
              {vi
                ? `Biệt danh giúp bạn dễ nhớ hơn. Tên Zalo thật của họ là "${matchingFriend?.zaloName || convo.name}".`
                : `A nickname helps you remember them. Their real Zalo name is "${matchingFriend?.zaloName || convo.name}".`}
            </div>
            <input
              autoFocus
              value={aliasDraft}
              onChange={(e) => setAliasDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSaveAlias()}
              placeholder={vi ? "Nhập biệt danh…" : "Enter nickname…"}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-[13.5px] text-text outline-none focus:border-accent transition-colors"
            />
            <div className="flex justify-between gap-2.5">
              <Button
                variant="ghost"
                onClick={() => void handleRemoveAlias()}
              >
                {vi ? "Xóa biệt danh" : "Remove Nickname"}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setAliasModal(false)}>
                  {vi ? "Hủy" : "Cancel"}
                </Button>
                <Button onClick={() => void handleSaveAlias()}>
                  {vi ? "Lưu" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {createGroupModal && (
        <Modal
          title={vi ? "Tạo nhóm mới" : "Create New Group"}
          onClose={() => {
            setCreateGroupModal(false);
            setNewGroupName("");
            setSelectedFriends([]);
            setCreateGroupSearch("");
            setNewGroupAvatar(null);
            setNewGroupAvatarPreview(null);
          }}
          width={420}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <Avatar
                  spec={{
                    hue: 200,
                    initials: newGroupName
                      ? newGroupName
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 3)
                          .toUpperCase()
                      : "G",
                    img: newGroupAvatarPreview || undefined,
                  }}
                  size={56}
                />
                <button
                  type="button"
                  onClick={() => createGroupFileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid h-[22px] w-[22px] place-items-center rounded-full border-[2px] border-surface-1 bg-accent text-[#0a1f16] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  title={vi ? "Chọn ảnh nhóm" : "Select group avatar"}
                >
                  <Icon name="camera" size={10} />
                </button>
                <input
                  ref={createGroupFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleNewGroupAvatarChange}
                />
              </div>
              <div className="flex-grow flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-muted">
                  {vi ? "Tên nhóm" : "Group Name"}
                </label>
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={vi ? "Nhập tên nhóm…" : "Enter group name…"}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-[13.5px] text-text outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 min-h-0">
              <label className="text-[12px] font-bold uppercase tracking-wider text-muted">
                {vi ? "Chọn thành viên" : "Select Members"} ({selectedFriends.length})
              </label>
              <SearchBox
                value={createGroupSearch}
                onChange={(e) => setCreateGroupSearch(e.target.value)}
                onClear={() => setCreateGroupSearch("")}
                placeholder={vi ? "Tìm bạn bè…" : "Search friends…"}
                className="mb-2"
              />
              <div className="max-h-[200px] overflow-y-auto flex flex-col border border-border rounded-xl divide-y divide-border/30 bg-surface-1">
                {friends
                  .filter((f) => !createGroupSearch.trim() || f.name.toLowerCase().includes(createGroupSearch.toLowerCase()))
                  .map((friend) => {
                    const isChecked = selectedFriends.includes(friend.id);
                    return (
                      <label
                        key={friend.id}
                        className="flex items-center gap-3 p-2.5 hover:bg-surface-2 cursor-pointer select-none transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedFriends((prev) => prev.filter((id) => id !== friend.id));
                            } else {
                              setSelectedFriends((prev) => [...prev, friend.id]);
                            }
                          }}
                          className="accent-accent h-4 w-4 rounded border-border"
                        />
                        <Avatar spec={{ hue: friend.hue, initials: friend.initials, img: friend.avatar }} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-text truncate">{friend.name}</div>
                          {friend.phone && <div className="text-[11px] text-muted truncate">{friend.phone}</div>}
                        </div>
                      </label>
                    );
                  })}
                {friends.length === 0 && (
                  <div className="p-6 text-center text-[12.5px] italic text-muted">
                    {vi ? "Chưa có bạn bè nào." : "No friends found."}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreateGroupModal(false);
                  setNewGroupName("");
                  setSelectedFriends([]);
                  setCreateGroupSearch("");
                  setNewGroupAvatar(null);
                  setNewGroupAvatarPreview(null);
                }}
              >
                {vi ? "Hủy" : "Cancel"}
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim() || selectedFriends.length === 0}
              >
                {creatingGroup ? (vi ? "Đang tạo…" : "Creating…") : (vi ? "Tạo nhóm" : "Create Group")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {forwardModal && messageToForward && (
        <Modal
          title={vi ? "Chia sẻ" : "Share"}
          onClose={() => {
            setForwardModal(false);
            setMessageToForward(null);
            setForwardSearch("");
            setForwardSelected([]);
            setForwardNote("");
            setForwardTab("recent");
          }}
          width={680}
        >
          <div className="flex flex-col gap-4 max-h-[78vh] min-h-[500px]">
            {/* Search Input */}
            <SearchBox
              value={forwardSearch}
              onChange={(e) => setForwardSearch(e.target.value)}
              onClear={() => setForwardSearch("")}
              placeholder={vi ? "Tìm kiếm..." : "Search..."}
            />

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-border pb-1">
              <div className="flex gap-4">
                <button
                  onClick={() => setForwardTab("recent")}
                  className={`pb-2 text-[13.5px] font-semibold relative transition-colors ${
                    forwardTab === "recent" ? "text-accent" : "text-muted hover:text-text"
                  }`}
                >
                  {vi ? "Gần đây" : "Recent"}
                  {forwardTab === "recent" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                  )}
                </button>
                <button
                  onClick={() => setForwardTab("groups")}
                  className={`pb-2 text-[13.5px] font-semibold relative transition-colors ${
                    forwardTab === "groups" ? "text-accent" : "text-muted hover:text-text"
                  }`}
                >
                  {vi ? "Nhóm trò chuyện" : "Chat groups"}
                  {forwardTab === "groups" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                  )}
                </button>
                <button
                  onClick={() => setForwardTab("friends")}
                  className={`pb-2 text-[13.5px] font-semibold relative transition-colors ${
                    forwardTab === "friends" ? "text-accent" : "text-muted hover:text-text"
                  }`}
                >
                  {vi ? "Bạn bè" : "Friends"}
                  {forwardTab === "friends" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                  )}
                </button>
              </div>
            </div>

            {/* Main Split Section */}
            <div className="grid grid-cols-[1fr_240px] border border-border rounded-xl min-h-[260px] max-h-[300px] overflow-hidden bg-surface-1">
              {/* Left Column: List of items */}
              <div className="overflow-y-auto p-1 divide-y divide-border/20">
                {filteredConversations.map((c) => {
                  const isChecked = forwardSelected.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-surface-2 cursor-pointer select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setForwardSelected((prev) => prev.filter((id) => id !== c.id));
                          } else {
                            setForwardSelected((prev) => [...prev, c.id]);
                          }
                        }}
                        className="accent-accent h-4 w-4 rounded border-border"
                      />
                      <Avatar spec={{ hue: c.hue, initials: c.initials, img: c.avatarImg }} size={32} />
                      <span className="text-[13px] font-semibold text-text truncate max-w-[220px]">{c.name}</span>
                    </label>
                  );
                })}
                {filteredConversations.length === 0 && (
                  <div className="p-8 text-center text-xs italic text-muted">
                    {vi ? "Không tìm thấy kết quả." : "No results found."}
                  </div>
                )}
              </div>

              {/* Right Column: Selected list summary */}
              <div className="border-l border-border bg-surface-2 flex flex-col min-h-0">
                <div className="p-2 border-b border-border flex items-center justify-between text-[11.5px] font-semibold text-muted">
                  <span>
                    {vi
                      ? `Đã chọn: ${forwardSelected.length}/100`
                      : `Selected: ${forwardSelected.length}/100`}
                  </span>
                  {forwardSelected.length > 0 && (
                    <button
                      onClick={() => setForwardSelected([])}
                      className="text-accent hover:underline text-[11.5px] font-semibold"
                    >
                      {vi ? "Xóa" : "Clear"}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1.5 min-h-0">
                  {conversations
                    .filter((c) => forwardSelected.includes(c.id))
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-1.5 p-1 rounded-lg hover:bg-surface-3 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar spec={{ hue: c.hue, initials: c.initials, img: c.avatarImg }} size={24} />
                          <span className="text-[12px] font-medium text-text truncate max-w-[130px]">{c.name}</span>
                        </div>
                        <button
                          onClick={() => setForwardSelected((prev) => prev.filter((id) => id !== c.id))}
                          className="text-muted hover:text-text p-0.5 transition-colors"
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    ))}
                  {forwardSelected.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-4 text-center text-[11.5px] italic text-muted">
                      {vi ? "Chưa chọn người nhận" : "No recipients selected"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message Preview */}
            <div className="rounded-xl border border-border bg-surface-2 p-3 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                {vi ? "Chia sẻ tin nhắn" : "Share message"}
              </span>
              <div className="text-[12.5px] text-muted max-h-[60px] overflow-y-auto whitespace-pre-wrap font-sans italic leading-relaxed">
                {messageToForward.kind === "image" ? (
                  <span className="inline-flex items-center gap-1.5"><Icon name="image" size={13} /> {vi ? "[Hình ảnh]" : "[Image]"}</span>
                ) : messageToForward.kind === "video" ? (
                  <span className="inline-flex items-center gap-1.5"><Icon name="camera" size={13} /> {vi ? "[Video]" : "[Video]"}</span>
                ) : messageToForward.kind === "file" ? (
                  <span className="font-semibold inline-flex items-center gap-1.5"><Icon name="doc" size={13} /> {messageToForward.fileName}</span>
                ) : messageToForward.kind === "voice" ? (
                  <span className="inline-flex items-center gap-1.5"><Icon name="chat" size={13} /> {vi ? "[Tin nhắn thoại]" : "[Voice message]"}</span>
                ) : messageToForward.kind === "location" ? (
                  <span className="inline-flex items-center gap-1.5"><Icon name="addr" size={13} /> {messageToForward.location?.title || (vi ? "[Vị trí]" : "[Location]")}</span>
                ) : messageToForward.kind === "card" ? (
                  <span className="inline-flex items-center gap-1.5"><Icon name="users" size={13} /> {messageToForward.card?.title || (vi ? "[Danh thiếp]" : "[Contact Card]")}</span>
                ) : (
                  <span>{messageToForward.text}</span>
                )}
              </div>
            </div>

            {/* Extra text input */}
            <div className="flex flex-col gap-1">
              <input
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
                placeholder={vi ? "Nhập tin nhắn..." : "Enter message..."}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] text-text outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => {
                  setForwardModal(false);
                  setMessageToForward(null);
                  setForwardSearch("");
                  setForwardSelected([]);
                  setForwardNote("");
                  setForwardTab("recent");
                }}
              >
                {vi ? "Hủy" : "Cancel"}
              </Button>
              <Button
                onClick={handleForwardSubmit}
                disabled={forwarding || forwardSelected.length === 0}
              >
                {forwarding ? (vi ? "Đang chia sẻ…" : "Sharing…") : (vi ? "Chia sẻ" : "Share")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out animate-fade-in"
        >
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white transition-colors"
          >
            <Icon name="x" size={20} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Full view" 
            className="max-h-[92vh] max-w-[92vw] object-contain rounded-lg shadow-2xl select-none animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function ProfileOptionRow({
  icon,
  text,
  danger = false,
  onClick,
}: {
  readonly icon: IconName;
  readonly text: string;
  readonly danger?: boolean;
  readonly onClick?: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-5 py-3 text-left hover:bg-surface-2 transition-colors ${
        danger ? "text-danger" : "text-text"
      }`}
    >
      <span className={`shrink-0 ${danger ? "text-danger" : "text-muted"}`}>
        <Icon name={icon} size={16} />
      </span>
      <span className="text-[13px] font-medium flex-1 truncate">{text}</span>
    </button>
  );
}

function guessGender(name: string): string {
  const lowercaseName = name.toLowerCase();
  const femaleKeywords = ["thị", "hà", "quỳnh", "anh", "trang", "vy", "huyền", "nhi", "nhung", "mai", "lan", "diệp", "an", "hằng", "linh", "ngọc", "hương", "phương"];
  if (femaleKeywords.some(kw => lowercaseName.includes(kw))) {
    return "Nữ";
  }
  return "Nam";
}

function getMutualGroupsCount(userId: string): number {
  if (!userId) return 0;
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 5);
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
        <div className="mt-0.5 flex items-center gap-1.5 font-sans">
          <span className={`flex-1 truncate text-[12.5px] ${convo.unread ? "text-text" : "text-muted"}`}>{convo.last}</span>
          {convo.auto ? <Icon name="bot" size={13} className="shrink-0 text-accent" /> : null}
          {convo.isMuted ? <Icon name="bellOff" size={13} className="shrink-0 text-muted/50" /> : null}
          {convo.unread > 0 ? (
            <span className={`grid h-[17px] min-w-[17px] place-items-center rounded-full px-1.5 text-[10.5px] font-semibold ${
              convo.isMuted 
                ? "bg-surface-3 border border-border text-muted" 
                : "bg-accent text-[#06140c]"
            }`}>
              {convo.unread}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ChatThread({ convo, messages, expired, vi, botId, onSendText, onSendImage, onSendFile, onSendSticker, onReactToMessage, onRecallMessage, onSendTypingStatus, onPinMessage, onUnpinMessage, isFriend = false, isSentRequest = false, isReceivedRequest = false, onAddFriend, onCancelRequest, onAcceptRequest, onDeclineRequest, onAvatarClick, onForwardClick, onToggleMute }: {
  readonly convo: Conversation | undefined; readonly messages: ReadonlyArray<Message>;
  readonly expired: boolean; readonly vi: boolean;
  readonly botId?: string;
  readonly onSendText: (t: string) => void; readonly onSendImage: (f: File, caption?: string) => void; readonly onSendFile: (f: File) => void;
  readonly onSendSticker?: (sticker: { sticker_id: number; cat_id: number; sticker_type: number; url: string }) => void;
  readonly onReactToMessage: (messageExternalId: string, reactIcon: string) => Promise<void>;
  readonly onRecallMessage: (messageExternalId: string) => Promise<void>;
  readonly onSendTypingStatus: (isTyping: boolean) => void;
  readonly onPinMessage: (messageExternalId: string) => Promise<void>;
  readonly onUnpinMessage: (topicId: string) => Promise<void>;
  readonly isFriend?: boolean;
  readonly isSentRequest?: boolean;
  readonly isReceivedRequest?: boolean;
  readonly onAddFriend?: () => void;
  readonly onCancelRequest?: () => void;
  readonly onAcceptRequest?: () => void;
  readonly onDeclineRequest?: () => void;
  readonly onAvatarClick?: () => void;
  readonly onForwardClick?: (m: Message) => void;
  readonly onToggleMute?: (muted: boolean) => void;
}): JSX.Element {
  void onUnpinMessage;
  const [draft, setDraft] = useState("");
  const [auto, setAuto] = useState(Boolean(convo?.auto));
  const [search, setSearch] = useState("");
  const [searchOn, setSearchOn] = useState(false);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [stickerQuery, setStickerQuery] = useState("");
  const [stickers, setStickers] = useState<Array<{ sticker_id: number; cat_id: number; sticker_type: number; url: string; sprite_url?: string }>>([]);
  const [stickersLoading, setStickersLoading] = useState(false);
  const stickerPickerRef = useRef<HTMLDivElement>(null);
  const [suggestedStickers, setSuggestedStickers] = useState<Array<{ sticker_id: number; cat_id: number; sticker_type: number; url: string }>>([]);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
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

  // Close sticker picker when clicking outside
  useEffect(() => {
    if (!showStickerPicker) return;
    const handler = (e: MouseEvent) => {
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(e.target as Node)) {
        setShowStickerPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStickerPicker]);

  // Load stickers when picker opens or query changes
  useEffect(() => {
    if (!showStickerPicker || !convo) return;
    if (!botId) return;
    let cancelled = false;
    setStickersLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/channels/zalo/stickers/${botId}${stickerQuery.trim() ? `?keyword=${encodeURIComponent(stickerQuery.trim())}` : ''}`) as any;
        if (!cancelled) setStickers(Array.isArray(res?.data) ? res.data : []);
      } catch { if (!cancelled) setStickers([]); }
      finally { if (!cancelled) setStickersLoading(false); }
    }, stickerQuery ? 400 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [showStickerPicker, stickerQuery, convo, botId]);

  // Emotion keyword → sticker search keyword mapping
  const EMOTION_KEYWORDS: Record<string, string> = {
    'haha': 'haha', 'hihi': 'haha', 'hehe': 'haha', 'lol': 'haha', 'lmao': 'haha', 'cười': 'haha',
    'buồn': 'buồn', 'sad': 'buồn', 'chán': 'buồn', 'khóc': 'khóc', 'cry': 'khóc', 'huhu': 'khóc',
    'tức': 'tức giận', 'giận': 'tức giận', 'angry': 'tức giận', 'bực': 'tức giận',
    'vui': 'vui', 'happy': 'vui', 'mừng': 'vui', 'thích': 'vui',
    'yêu': 'yêu', 'love': 'yêu', 'thương': 'yêu', 'cute': 'cute', 'dễ thương': 'cute',
    'wow': 'wow', 'ngạc nhiên': 'wow', 'surprised': 'wow',
    'sợ': 'sợ', 'fear': 'sợ', 'scared': 'sợ',
    'xin lỗi': 'xin lỗi', 'sorry': 'xin lỗi',
    'ok': 'ok', 'oke': 'ok', 'okay': 'ok',
    'ghê': 'tức giận',
  };

  // Watch draft for emotion keywords in first 2 words
  useEffect(() => {
    if (!botId || !onSendSticker) return;
    const words = draft.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 2) {
      setSuggestedStickers([]);
      setSuggestionDismissed(false);
      return;
    }
    const firstTwo = words.slice(0, 2).join(' ');
    let keyword: string | null = null;
    for (const [trigger, mapped] of Object.entries(EMOTION_KEYWORDS)) {
      if (firstTwo.includes(trigger)) { keyword = mapped; break; }
    }
    if (!keyword) { setSuggestedStickers([]); return; }
    if (suggestionDismissed) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/channels/zalo/stickers/${botId}?keyword=${encodeURIComponent(keyword as string)}`) as any;
        if (!cancelled) setSuggestedStickers(Array.isArray(res?.data) ? res.data.slice(0, 20) : []);
      } catch { if (!cancelled) setSuggestedStickers([]); }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, botId, suggestionDismissed]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  if (!convo) return <div className="grid place-items-center bg-chat text-muted">—</div>;

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

  const renderSubtitle = () => {
    if (convo.type === "group") {
      return `${convo.members} ${vi ? "thành viên" : "members"}`;
    }
    
    const statusText = convo.online 
      ? (vi ? "Đang hoạt động" : "Online") 
      : (convo.presenceText ?? (vi ? "Ngoại tuyến" : "Offline"));

    if (!isFriend) {
      const mutualCount = getMutualGroupsCount(convo.phone || "");
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 min-w-0">
          <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[9.5px] font-bold text-muted uppercase tracking-wide shrink-0">
            {vi ? "NGƯỜI LẠ" : "STRANGER"}
          </span>
          <span className="text-border/80 select-none">|</span>
          <span className="inline-flex items-center gap-1 truncate">
            <Icon name="users" size={11} className="text-muted/70 shrink-0" />
            <span className="truncate">{vi ? `Nhóm chung (${mutualCount})` : `Mutual groups (${mutualCount})`}</span>
          </span>
        </div>
      );
    }

    return statusText;
  };

  const renderFriendBanner = () => {
    if (convo.type !== "direct" || isFriend) return null;

    return (
      <div className="flex items-center justify-between border-b border-border bg-surface-1 p-[10px_20px] select-none animate-fade-in">
        <div className="flex items-center gap-2.5 text-xs text-text min-w-0">
          <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-accent-dim text-accent shrink-0">
            <Icon name="userPlus" size={14} />
          </span>
          <span className="truncate font-medium text-muted">
            {isSentRequest
              ? (vi ? "Đã gửi yêu cầu kết bạn tới người này" : "Friend request sent to this person")
              : isReceivedRequest
              ? (vi ? "Người này đã gửi lời mời kết bạn cho bạn" : "This person sent you a friend request")
              : (vi ? "Gửi yêu cầu kết bạn tới người này" : "Send a friend request to this person")}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSentRequest ? (
            <button
              onClick={onCancelRequest}
              className="bg-surface-3 hover:bg-surface-4 text-text text-[11.5px] font-semibold py-1.5 px-3.5 rounded-lg transition-colors select-none"
            >
              {vi ? "Thu hồi" : "Recall"}
            </button>
          ) : isReceivedRequest ? (
            <>
              <button
                onClick={onDeclineRequest}
                className="bg-surface-3 hover:bg-surface-4 text-text text-[11.5px] font-semibold py-1.5 px-3.5 rounded-lg transition-colors select-none"
              >
                {vi ? "Từ chối" : "Decline"}
              </button>
              <button
                onClick={onAcceptRequest}
                className="bg-accent text-[#06140c] hover:bg-accent/90 text-[11.5px] font-semibold py-1.5 px-3.5 rounded-lg transition-colors select-none"
              >
                {vi ? "Đồng ý" : "Accept"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onAddFriend}
                className="bg-accent-dim hover:bg-accent/20 text-accent text-[11.5px] font-semibold py-1.5 px-3.5 rounded-lg transition-colors select-none"
              >
                {vi ? "Gửi kết bạn" : "Add Friend"}
              </button>
              <button className="grid h-[28px] w-[28px] place-items-center rounded-lg border border-border bg-surface-0 text-muted hover:text-text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-0 flex-col bg-chat">
      <div className="flex items-center gap-3 border-b border-border bg-surface-0 p-[13px_20px]">
        <div 
          className={convo.type === "direct" ? "flex flex-1 items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity min-w-0" : "flex flex-1 items-center gap-3 min-w-0"}
          onClick={() => convo.type === "direct" && onAvatarClick?.()}
        >
          <Avatar spec={{ hue: convo.hue, initials: convo.initials, img: convo.avatarImg }} size={38} status={convo.type === "direct" ? (convo.online ? "online" : "offline") : undefined} />
          <div className="min-w-0">
            <div className="text-[14.5px] font-semibold truncate">{convo.name}</div>
            <div className="text-[11.5px] text-muted">{renderSubtitle()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-[9px] border border-border p-[6px_11px]" style={{ background: auto && !expired ? "var(--accent-dim)" : "var(--surface-3)", opacity: expired ? 0.5 : 1, pointerEvents: expired ? "none" : "auto" }}>
          <Icon name="bot" size={15} className={auto && !expired ? "text-accent" : "text-muted"} />
          <span className={`text-xs font-semibold ${auto && !expired ? "text-accent" : "text-muted"}`}>{vi ? "Tự trả lời" : "Auto"}</span>
          <Toggle on={auto && !expired} onChange={setAuto} />
        </div>
        <button 
          onClick={() => onToggleMute?.(!convo.isMuted)} 
          title={convo.isMuted ? (vi ? "Bật âm báo" : "Unmute") : (vi ? "Tắt âm báo" : "Mute")}
          className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border transition-colors cursor-pointer ${
            convo.isMuted 
              ? "bg-[rgba(217,104,95,0.15)] border-[rgba(217,104,95,0.3)] text-danger hover:bg-[rgba(217,104,95,0.25)]" 
              : "text-muted hover:text-text hover:bg-surface-2"
          }`}
        >
          <Icon name={convo.isMuted ? "bellOff" : "bell"} size={16} />
        </button>
        <button onClick={() => setSearchOn((v) => !v)} className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border ${searchOn ? "bg-accent-dim text-accent" : "text-muted hover:text-text"}`}><Icon name="search" size={16} /></button>
      </div>

      {renderFriendBanner()}

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

            const rawObj = typeof m.raw === "string" ? (() => { try { return JSON.parse(m.raw); } catch { return null; } })() : m.raw;
            const isFriendEvent = !!(rawObj && rawObj.isFriendEvent);
            const eventType = rawObj?.eventType;
            const iconColor = isFriendEvent
              ? (eventType === "add" || eventType === "unblock" ? "#10b981" : "#ef4444")
              : "#f97316";

            return (
              <div key={m.id} className="flex items-center justify-center my-2 select-none animate-fade-in w-full">
                <div 
                  className="inline-flex items-center shadow-sm rounded-full py-1.5 px-4 text-[12px] max-w-[90%]"
                  style={{
                    backgroundColor: "var(--bubble-them-bg)",
                    color: "var(--bubble-them-text)",
                  }}
                >
                  {isFriendEvent ? (
                    <Icon name="users" size={13} style={{ color: iconColor }} className="mr-1.5 shrink-0" />
                  ) : (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0 rotate-[45deg]">
                      <line x1="12" y1="17" x2="12" y2="22" />
                      <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.12-2.65A2 2 0 0 1 16 10.11V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v5.11a2 2 0 0 1-.44 1.24L5.44 14a2 2 0 0 0-.44 1.24z" />
                    </svg>
                  )}
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
              onForward={onForwardClick}
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

          {/* Smart Sticker Suggestion Strip */}
          {suggestedStickers.length > 0 && onSendSticker && !showStickerPicker && (
            <div className="flex items-center gap-1.5 border-b border-border bg-surface-2/80 px-3 py-2 overflow-hidden" style={{ animation: 'slideDown 0.18s ease-out' }}>
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-accent/80 mr-0.5 select-none">✨</span>
                {suggestedStickers.map((s) => (
                  <button
                    key={s.sticker_id}
                    onClick={() => { onSendSticker(s); setSuggestedStickers([]); setSuggestionDismissed(true); }}
                    className="shrink-0 h-[72px] w-[72px] flex items-center justify-center rounded-xl hover:bg-surface-3 hover:scale-110 active:scale-95 transition-all duration-150"
                    title={`Sticker #${s.sticker_id}`}
                  >
                    <img src={s.url} alt="" className="h-[64px] w-[64px] object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setSuggestedStickers([]); setSuggestionDismissed(true); }}
                className="shrink-0 grid h-6 w-6 place-items-center rounded-full text-muted hover:text-text hover:bg-surface-3 transition-colors ml-1"
                title={vi ? 'Ẩn gợi ý' : 'Dismiss'}
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          )}

          <div className="p-[12px_18px_16px]">
            {auto ? <div className="mb-2.5 flex items-center gap-2 text-[11.5px] text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> {vi ? "AI đang tự trả lời · nhập để tiếp quản" : "AI is replying · type to take over"}</div> : null}
            <div className="relative flex items-center gap-2">
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSelectedImage(f); setImagePreviewUrl(URL.createObjectURL(f)); } e.target.value = ""; }} />
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSendFile(f); e.target.value = ""; }} />
              <button onClick={() => imgRef.current?.click()} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border text-muted hover:text-text"><Icon name="image" size={18} /></button>
              <button onClick={() => fileRef.current?.click()} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border text-muted hover:text-text"><Icon name="paperclip" size={18} /></button>
              {onSendSticker && (
                <button
                  onClick={() => { setShowStickerPicker(v => !v); setStickerQuery(""); }}
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border transition-colors ${showStickerPicker ? 'border-accent text-accent bg-accent/10' : 'text-muted hover:text-text'}`}
                  title={vi ? "Nhãn dán" : "Stickers"}
                >
                  <Icon name="smile" size={18} />
                </button>
              )}
              <div className="flex flex-1 items-center rounded-xl border border-border bg-surface-2 p-[4px_6px_4px_14px]">
                <input value={draft} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={vi ? "Nhập tin nhắn…" : "Type a message…"} className="flex-1 bg-transparent py-2 text-sm text-text outline-none" />
              </div>
              <Button icon="send" onClick={send} className="rounded-xl px-4 py-2.5">{vi ? "Gửi" : "Send"}</Button>

              {/* Sticker Picker Overlay */}
              {showStickerPicker && onSendSticker && (
                <div
                  ref={stickerPickerRef}
                  className="absolute bottom-[calc(100%+12px)] left-0 z-50 w-[340px] rounded-2xl border border-border bg-surface-0/95 shadow-2xl backdrop-blur-xl overflow-hidden"
                  style={{ boxShadow: '0 -4px 40px rgba(0,0,0,0.35)' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                    <span className="text-[12px] font-bold text-text">{vi ? '🎭 Nhãn dán' : '🎭 Stickers'}</span>
                    <button onClick={() => setShowStickerPicker(false)} className="grid h-6 w-6 place-items-center rounded-full text-muted hover:text-text hover:bg-surface-3 transition-colors">
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                  {/* Search */}
                  <div className="px-3 pt-2.5 pb-2">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" /></svg>
                      <input
                        value={stickerQuery}
                        onChange={e => setStickerQuery(e.target.value)}
                        placeholder={vi ? 'Tìm nhãn dán…' : 'Search stickers…'}
                        className="flex-1 bg-transparent text-[12.5px] text-text outline-none placeholder:text-muted"
                        autoFocus
                      />
                      {stickerQuery && (
                        <button onClick={() => setStickerQuery('')} className="text-muted hover:text-text">
                          <Icon name="x" size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Grid */}
                  <div className="h-[220px] overflow-y-auto px-2 pb-2 no-scrollbar">
                    {stickersLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => (
                            <span key={i} className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    ) : stickers.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-[12px] text-muted italic">
                        {vi ? 'Không tìm thấy nhãn dán' : 'No stickers found'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1 pt-1">
                        {stickers.map((s) => (
                          <button
                            key={s.sticker_id}
                            onClick={() => {
                              onSendSticker(s);
                              setShowStickerPicker(false);
                            }}
                            className="group relative flex items-center justify-center rounded-xl p-1 transition-all hover:bg-surface-3 hover:scale-105 active:scale-95"
                            title={`Sticker #${s.sticker_id}`}
                          >
                            <img
                              src={s.url}
                              alt={`sticker-${s.sticker_id}`}
                              className="h-16 w-16 object-contain"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ message, prev, vi, highlight, onReact, onRecall, onPin, onForward }: { readonly message: Message; readonly prev: Message | undefined; readonly vi: boolean; readonly highlight: string; readonly onReact: (messageExternalId: string, reactIcon: string) => Promise<void>; readonly onRecall: (messageExternalId: string) => Promise<void>; readonly onPin: (messageExternalId: string) => Promise<void>; readonly onForward?: (m: Message) => void }): JSX.Element {
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
          className={`${message.kind === 'sticker' && !message.isRecalled ? 'bg-transparent border-0 shadow-none' : cls} flex-1 rounded-[17px] p-[10px_14px] text-[13.5px] leading-relaxed relative cursor-pointer select-text`}
          style={
            message.kind === 'sticker' && !message.isRecalled
              ? { background: 'none', border: 'none', boxShadow: 'none', padding: 2 }
              : (!message.isRecalled || (showRecalledContent && (message.kind === "image" || message.kind === "video")))
                ? (message.kind === "image" || message.kind === "video" ? { padding: 4 } : undefined)
                : undefined
          }
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
                  ) : message.kind === "voice" ? (
                    <div className="flex items-center gap-2 py-1">
                      <audio src={message.voiceUrl} controls className="block max-w-full rounded-lg" style={{ height: '40px' }} />
                    </div>
                  ) : message.kind === "card" ? (
                    <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                      <div className="flex items-center gap-2.5">
                        <Avatar spec={{ initials: (message.card?.title || "C").split(" ").map(n => n[0]).join(""), img: message.card?.thumb, hue: 200 }} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-text">{message.card?.title}</div>
                          <div className="truncate text-[10px] text-muted">{vi ? "Gợi ý kết bạn" : "Suggested contact"}</div>
                        </div>
                      </div>
                    </div>
                  ) : message.kind === "location" ? (
                    <div className="flex flex-col gap-1.5 p-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-accent/20 text-accent">
                          <Icon name="addr" size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-text">{message.location?.title || (vi ? "Vị trí chia sẻ" : "Shared Location")}</div>
                          <div className="truncate text-[10px] text-muted">{message.location?.description}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Highlighted text={message.text ?? ""} q={highlight} />
                  )}
                </div>
              )}
            </div>
          ) : message.kind === "sticker" ? (
            <img src={message.img} alt="Sticker" className="block w-[130px] h-[130px] object-contain select-none" style={{ imageRendering: 'auto' }} />
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
          ) : message.kind === "voice" ? (
            <div className="flex items-center gap-2 py-1">
              <audio src={message.voiceUrl} controls className="block max-w-full rounded-lg" style={{ height: '40px' }} />
            </div>
          ) : message.kind === "card" ? (
            <div className="flex flex-col gap-2.5 p-1 min-w-[200px] max-w-[280px]">
              <div className="flex items-center gap-3">
                <Avatar spec={{ initials: (message.card?.title || "C").split(" ").map(n => n[0]).join(""), img: message.card?.thumb, hue: 200 }} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-text">{message.card?.title}</div>
                  <div className="truncate text-[11px] text-muted">{vi ? "Gợi ý kết bạn" : "Suggested contact"}</div>
                </div>
              </div>
              {message.card?.qrCodeUrl && (
                <div className="relative group overflow-hidden rounded-lg border border-border bg-black/10 p-2.5 flex flex-col items-center justify-center gap-2">
                  <img src={message.card.qrCodeUrl} alt="QR" className="w-28 h-28 object-contain rounded-md" />
                  <span className="text-[10px] text-muted text-center select-none">{vi ? "Quét mã QR để kết bạn" : "Scan QR to add friend"}</span>
                </div>
              )}
              {message.card?.userId && (
                <div className="flex gap-2 mt-1">
                  <a
                    href={`https://zalo.me/${message.card.userId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center bg-accent text-[#06140c] hover:bg-accent/90 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors select-none"
                  >
                    {vi ? "Nhắn tin" : "Message"}
                  </a>
                </div>
              )}
            </div>
          ) : message.kind === "location" ? (
            <div className="flex flex-col gap-2.5 p-1 min-w-[200px] max-w-[280px]">
              <div className="flex items-start gap-2.5">
                <span className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-lg bg-accent/20 text-accent">
                  <Icon name="addr" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-text">{message.location?.title || (vi ? "Vị trí chia sẻ" : "Shared Location")}</div>
                  <div className="text-[11.5px] opacity-80 leading-snug mt-0.5">{message.location?.description}</div>
                </div>
              </div>
              {message.location?.url && (
                <div className="flex gap-2 mt-1">
                  <a
                    href={message.location.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-[#06140c] hover:bg-accent/90 text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors select-none"
                  >
                    <Icon name="link" size={13} />
                    {vi ? "Xem trên Bản đồ" : "View on Map"}
                  </a>
                </div>
              )}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.95v6.05c0 1.25.75 2 2 2h3v1c0 3.22-1.78 5.22-5 6.22v1.78zm12 0c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c-1.25 0-2 .75-2 1.95v6.05c0 1.25.75 2 2 2h3v1c0 3.22-1.78 5.22-5 6.22v1.78z" />
              </svg>
              <span>{vi ? "Trả lời" : "Reply"}</span>
            </button>
            
            <button
              onClick={() => {
                setContextMenu(null);
                onForward?.(message);
              }}
              className="flex items-center gap-2.5 w-full text-left rounded-md px-2 py-1.5 hover:bg-surface-2 transition-colors"
            >
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span>{vi ? "Chuyển tiếp" : "Forward"}</span>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5" />
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
