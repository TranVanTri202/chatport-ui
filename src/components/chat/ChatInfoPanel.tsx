"use client";

import { useEffect, useRef, useState } from "react";
import type { Account, Conversation, GroupMember } from "@/types";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { SearchBox } from "@/components/ui/SearchBox";
import { useToast } from "@/providers/ToastProvider";

type FriendState = "friend" | "none" | "pending";

/** Right-hand info panel: contact + friend actions (direct) or group management. */
export function ChatInfoPanel({
  account,
  convo,
  vi,
  onToggleMute,
}: {
  readonly account: Account;
  readonly convo: Conversation;
  readonly vi: boolean;
  readonly onToggleMute: (isMuted: boolean) => void;
}): JSX.Element {
  const isGroup = convo.type === "group";

  return (
    <aside className="overflow-y-auto border-l border-border bg-surface-0 p-5">
      {isGroup ? <GroupHeader account={account} convo={convo} vi={vi} /> : <DirectHeader convo={convo} vi={vi} />}

      <section className="border-b border-border py-4">
        <Label>{vi ? "Trạng thái AI" : "AI status"}</Label>
        <div className="flex flex-col gap-2.5">
          <Row label={vi ? "Tự trả lời" : "Auto reply"} value={convo.auto ? (vi ? "Bật" : "On") : vi ? "Tắt" : "Off"} accent={convo.auto} />
          <Row label={vi ? "Mô hình AI" : "Model"} value={account.model} />
          <Row label={vi ? "AI tự gửi" : "Sent by AI"} value={`${account.aiToday} ${vi ? "hôm nay" : "today"}`} />
        </div>
      </section>

      <section className="border-b border-border py-4">
        <Label>{vi ? "Cài đặt hội thoại" : "Conversation settings"}</Label>
        <div className="flex flex-col gap-2.5 font-sans">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-muted">{vi ? "Tắt thông báo" : "Mute notifications"}</span>
            <Toggle on={Boolean(convo.isMuted)} onChange={onToggleMute} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 pt-4">
        <Button variant="soft" icon="bot" className="w-full">{vi ? "Cấu hình Auto Reply" : "Auto Reply settings"}</Button>
        <Button variant="ghost" icon="handoff" className="w-full">{vi ? "Chuyển người thật" : "Hand off"}</Button>
      </div>
    </aside>
  );
}

function DirectHeader({ convo, vi }: { readonly convo: Conversation; readonly vi: boolean }): JSX.Element {
  const [fs, setFs] = useState<FriendState>(convo.friend ? "friend" : "none");
  useEffect(() => setFs(convo.friend ? "friend" : "none"), [convo.id, convo.friend]);
  useEffect(() => {
    if (fs !== "pending") return undefined;
    const id = setTimeout(() => setFs("friend"), 2000);
    return () => clearTimeout(id);
  }, [fs]);

  return (
    <>
      <div className="flex flex-col items-center gap-2.5 border-b border-border pb-[18px]">
        <Avatar spec={{ hue: convo.hue, initials: convo.initials, img: convo.avatarImg }} size={68} status={convo.online ? "online" : "offline"} />
        <div className="text-center">
          <div className="text-[15.5px] font-semibold">{convo.name}</div>
          {convo.nick ? <div className="mt-0.5 text-[12.5px] text-muted">~ {convo.nick}</div> : null}
          <div className="mt-1 text-xs text-muted">{convo.online ? (vi ? "Đang hoạt động" : "Online") : (convo.presenceText ?? (vi ? "Ngoại tuyến" : "Offline"))}</div>
        </div>
        {fs === "friend" ? null : fs === "none" ? (
          <Button size="sm" icon="userPlus" onClick={() => setFs("pending")}>{vi ? "Kết bạn" : "Add friend"}</Button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(245,176,66,.12)] px-3 py-1.5 text-[12.5px] font-semibold text-warning"><Icon name="clock" size={13} /> {vi ? "Đã gửi lời mời" : "Request sent"}</span>
            <button onClick={() => setFs("none")} className="text-xs text-muted underline">{vi ? "Thu hồi" : "Recall"}</button>
          </div>
        )}
      </div>
    </>
  );
}


function GroupHeader({ account, convo, vi }: { readonly account: Account; readonly convo: Conversation; readonly vi: boolean }): JSX.Element {
  const { showToast } = useToast();
  const [name, setName] = useState(convo.name);
  const [img, setImg] = useState<string | undefined>(convo.avatarImg);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(convo.name);
  
  const [membersModal, setMembersModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [settingsModal, setSettingsModal] = useState(false);
  const [pendingModal, setPendingModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: "danger" | "primary";
  } | null>(null);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<Array<GroupMember & { id: string; role?: string; isOwner?: boolean; isAdmin?: boolean }>>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [groupSettings, setGroupSettings] = useState<any>(convo.metadata?.settings || {});

  useEffect(() => {
    setGroupSettings(convo.metadata?.settings || {});
  }, [convo.id, convo.metadata]);

  const fetchParticipants = async () => {
    try {
      const res = await api.get<{ items: any[] }>(
        `/bots/zalo/${account.phone}/conversations/${convo.id}/participants`
      );
      const mappedMembers = res.items.map((p) => {
        const initials = (p.displayName || "G")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        
        let hash = 0;
        const nameStr = p.displayName || "";
        for (let i = 0; i < nameStr.length; i++) {
          hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);

        return {
          id: p.externalId,
          name: p.displayName || p.externalId,
          initials,
          hue,
          admin: p.isBot, // Bot itself
          role: p.role,
          isOwner: p.isOwner,
          isAdmin: p.isAdmin,
          avatar: p.avatar || undefined,
        };
      });
      setMembers(mappedMembers);
    } catch (error) {
      console.error("Failed to fetch group participants:", error);
    }
  };

  const loadFriends = async () => {
    try {
      const contacts = await api.get<any[]>(`/bots/zalo/${account.phone}/contacts`);
      const mappedFriends = contacts.map((c) => {
        const initials = (c.name || "ZF")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        let hash = 0;
        const nameStr = c.name || "";
        for (let i = 0; i < nameStr.length; i++) {
          hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return {
          id: c.externalId,
          name: c.name,
          initials,
          hue,
          avatar: c.avatar || undefined,
        };
      });
      setFriends(mappedFriends);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await api.get<{ users?: any[] }>(`/bots/zalo/${account.phone}/conversations/${convo.id}/pending-members`);
      setPendingUsers(res.users || []);
      setPendingCount(res.users?.length || 0);
    } catch (err) {
      console.warn("Failed to check pending members:", err);
    }
  };

  useEffect(() => {
    setName(convo.name);
    setImg(convo.avatarImg);
    setEditing(false);
    void fetchParticipants();
  }, [convo.id, convo.name, convo.avatarImg]);

  const botMember = members.find((m) => m.admin);
  const botRole = botMember?.role || 'member';
  const isBotOwner = botRole === 'owner';
  const isBotDeputy = botRole === 'deputy';
  const isBotAdmin = isBotOwner || isBotDeputy;

  useEffect(() => {
    if (isBotAdmin) {
      void fetchPendingUsers();
    } else {
      setPendingCount(0);
    }
  }, [convo.id, isBotAdmin]);

  useEffect(() => {
    if (inviteModal) {
      void loadFriends();
    }
  }, [inviteModal]);

  const handleSaveName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === convo.name) {
      setEditing(false);
      return;
    }
    try {
      await api.patch(`/bots/zalo/${account.phone}/conversations/${convo.id}/title`, { title: trimmed });
      setName(trimmed);
      setEditing(false);
      showToast(vi ? "Đã đổi tên nhóm thành công!" : "Successfully renamed group!", "success");
    } catch (err) {
      console.error("Failed to rename group:", err);
      showToast(vi ? `Lỗi đổi tên: ${(err as Error).message}` : `Failed to rename: ${(err as Error).message}`, "error");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const dataUrl = `data:${f.type};name=${encodeURIComponent(f.name)};base64,${base64.split(",")[1]}`;
      try {
        await api.post(`/bots/zalo/${account.phone}/conversations/${convo.id}/avatar`, { avatar: dataUrl });
        setImg(URL.createObjectURL(f));
        showToast(vi ? "Đã cập nhật ảnh đại diện nhóm!" : "Successfully updated group avatar!", "success");
      } catch (err) {
        console.error("Failed to update group avatar:", err);
        showToast(vi ? `Lỗi đổi ảnh đại diện: ${(err as Error).message}` : `Failed to update avatar: ${(err as Error).message}`, "error");
      }
    };
    reader.readAsDataURL(f);
  };

  const handleUpdateSetting = async (key: string, checked: boolean) => {
    const nextSettings = {
      ...groupSettings,
      [key]: checked,
    };
    try {
      await api.patch(`/bots/zalo/${account.phone}/conversations/${convo.id}/group-settings`, {
        [key]: checked,
      });
      setGroupSettings(nextSettings);
      showToast(vi ? "Đã cập nhật cấu hình nhóm!" : "Successfully updated group setting!", "success");
    } catch (err) {
      console.error("Failed to update setting:", err);
      showToast(vi ? `Lỗi cập nhật cài đặt: ${(err as Error).message}` : `Failed to update setting: ${(err as Error).message}`, "error");
    }
  };

  const handleRemoveMember = async (uid: string) => {
    setConfirmModal({
      title: vi ? "Xác nhận xóa thành viên" : "Remove Member",
      message: vi ? "Bạn có chắc chắn muốn xóa thành viên này?" : "Are you sure you want to remove this member?",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/bots/zalo/${account.phone}/conversations/${convo.id}/members/${uid}`);
          setMembers((prev) => prev.filter((m) => m.id !== uid));
          showToast(vi ? "Đã xóa thành viên khỏi nhóm!" : "Successfully removed member!", "success");
        } catch (err) {
          console.error(err);
          showToast(vi ? `Lỗi xóa thành viên: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handlePromoteDeputy = async (uid: string) => {
    try {
      await api.post(`/bots/zalo/${account.phone}/conversations/${convo.id}/deputies`, { userId: uid });
      void fetchParticipants();
      showToast(vi ? "Đã bổ nhiệm phó nhóm!" : "Successfully promoted deputy!", "success");
    } catch (err) {
      console.error(err);
      showToast(vi ? `Lỗi bổ nhiệm: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
    }
  };

  const handleDemoteDeputy = async (uid: string) => {
    try {
      await api.delete(`/bots/zalo/${account.phone}/conversations/${convo.id}/deputies/${uid}`);
      void fetchParticipants();
      showToast(vi ? "Đã bãi nhiệm phó nhóm!" : "Successfully demoted deputy!", "success");
    } catch (err) {
      console.error(err);
      showToast(vi ? `Lỗi bãi nhiệm: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
    }
  };

  const handleChangeOwner = async (uid: string) => {
    setConfirmModal({
      title: vi ? "Chuyển quyền trưởng nhóm" : "Transfer Ownership",
      message: vi 
        ? "Bạn có chắc chắn muốn chuyển trưởng nhóm cho người này? Bạn sẽ mất quyền trưởng nhóm." 
        : "Are you sure you want to transfer ownership? You will lose owner status.",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.post(`/bots/zalo/${account.phone}/conversations/${convo.id}/change-owner`, { userId: uid });
          void fetchParticipants();
          showToast(vi ? "Đã chuyển quyền trưởng nhóm!" : "Successfully transferred ownership!", "success");
        } catch (err) {
          console.error(err);
          showToast(vi ? `Lỗi chuyển quyền: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleLeaveGroup = async () => {
    setConfirmModal({
      title: vi ? "Xác nhận rời nhóm" : "Leave Group",
      message: vi ? "Bạn có chắc chắn muốn rời nhóm này?" : "Are you sure you want to leave this group?",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.post(`/bots/zalo/${account.phone}/conversations/${convo.id}/leave`);
          showToast(vi ? "Đã rời nhóm thành công!" : "Successfully left the group!", "success");
          window.location.reload();
        } catch (err) {
          console.error(err);
          showToast(vi ? `Lỗi rời nhóm: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDisperseGroup = async () => {
    setConfirmModal({
      title: vi ? "Xác nhận giải tán nhóm" : "Disperse Group",
      message: vi ? "Bạn có chắc chắn muốn giải tán nhóm này? Tất cả thành viên sẽ bị mời ra khỏi nhóm." : "Are you sure you want to disperse this group?",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.post(`/bots/zalo/${account.phone}/conversations/${convo.id}/disperse`);
          showToast(vi ? "Đã giải tán nhóm thành công!" : "Successfully dispersed the group!", "success");
          window.location.reload();
        } catch (err) {
          console.error(err);
          showToast(vi ? `Lỗi giải tán: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const extra = 0;

  return (
    <>
      <div className="flex flex-col items-center gap-2.5 border-b border-border pb-[18px]">
        <div className="relative">
          <Avatar spec={{ hue: convo.hue, initials: convo.initials, img }} size={68} />
          <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid h-[26px] w-[26px] place-items-center rounded-full border-[2.5px] border-surface-0 bg-accent text-[#0a1f16] cursor-pointer"><Icon name="camera" size={13} /></button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="w-full text-center">
          {editing ? (
            <div className="flex items-center justify-center gap-1.5">
              <input value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { void handleSaveName(draft); } }} className="max-w-[190px] rounded-[10px] border border-border bg-surface-2 p-[8px_10px] text-center text-text outline-none" />
              <button onClick={() => void handleSaveName(draft)} className="grid h-7 w-7 place-items-center rounded-[9px] border border-border cursor-pointer"><Icon name="check" size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-[15.5px] font-semibold">
              {name}
              <button onClick={() => { setDraft(name); setEditing(true); }} className="flex p-0.5 text-muted cursor-pointer"><Icon name="edit" size={13} /></button>
            </div>
          )}
          <div className="mt-1 text-xs text-muted">{members.length} {vi ? "thành viên" : "members"}</div>
        </div>
      </div>

      <section className="border-b border-border py-4">
        <div className="mb-2.5 flex items-center justify-between">
          <Label>{vi ? "Thành viên" : "Members"} · {members.length}</Label>
          <button
            onClick={() => {
              void fetchParticipants();
              setMembersModal(true);
            }}
            className="text-[12.5px] font-semibold text-accent cursor-pointer"
          >
            {vi ? "Xem tất cả" : "View all"}
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {members.slice(0, 4).map((m, i) => (
            <MemberRow
              key={i}
              member={m}
              isBotAdmin={isBotAdmin}
              isBotOwner={isBotOwner}
              onRemove={handleRemoveMember}
              onPromote={handlePromoteDeputy}
              onDemote={handleDemoteDeputy}
              onChangeOwner={handleChangeOwner}
              vi={vi}
            />
          ))}
        </div>
        <button onClick={() => setInviteModal(true)} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-2.5 text-[13px] font-medium text-muted hover:border-accent-border hover:text-accent cursor-pointer transition-colors"><Icon name="userPlus" size={15} /> {vi ? "Mời thành viên" : "Invite member"}</button>
      </section>

      {isBotAdmin && pendingCount > 0 && (
        <button
          onClick={() => setPendingModal(true)}
          className="mt-2.5 flex w-full items-center justify-between rounded-xl bg-[rgba(245,176,66,.12)] p-2.5 text-[13px] font-semibold text-warning border border-warning/20 hover:bg-[rgba(245,176,66,0.18)] transition-colors cursor-pointer select-none"
        >
          <span className="flex items-center gap-2">
            <Icon name="clock" size={15} />
            {vi ? "Yêu cầu chờ duyệt" : "Pending join requests"}
          </span>
          <span className="rounded-full bg-warning px-2 py-0.5 text-[10.5px] font-bold text-surface">{pendingCount}</span>
        </button>
      )}

      <div className="flex flex-col gap-2.5 pt-4 border-b border-border pb-4">
        {isBotAdmin && (
          <Button variant="soft" icon="settings" className="w-full" onClick={() => setSettingsModal(true)}>
            {vi ? "Cài đặt nhóm" : "Group settings"}
          </Button>
        )}
        {isBotOwner ? (
          <Button variant="danger" icon="trash" className="w-full" onClick={handleDisperseGroup}>
            {vi ? "Giải tán nhóm" : "Disperse group"}
          </Button>
        ) : (
          <Button variant="danger" icon="logout" className="w-full" onClick={handleLeaveGroup}>
            {vi ? "Rời nhóm" : "Leave group"}
          </Button>
        )}
      </div>

      {membersModal && (
        <Modal title={`${vi ? "Thành viên" : "Members"} · ${members.length}`} onClose={() => setMembersModal(false)} width={380}>
          <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[350px]">
            {members.map((m, i) => (
              <MemberRow
                key={i}
                member={m}
                isBotAdmin={isBotAdmin}
                isBotOwner={isBotOwner}
                onRemove={handleRemoveMember}
                onPromote={handlePromoteDeputy}
                onDemote={handleDemoteDeputy}
                onChangeOwner={handleChangeOwner}
                vi={vi}
              />
            ))}
            {extra > 0 ? <div className="p-[10px_2px] text-[12.5px] italic text-muted">+ {extra} {vi ? "thành viên khác" : "more"}</div> : null}
          </div>
        </Modal>
      )}

      {inviteModal && (
        <Modal
          title={vi ? "Mời vào nhóm" : "Invite Members"}
          onClose={() => {
            setInviteModal(false);
            setInviteSearch("");
          }}
          width={380}
        >
          <div className="flex flex-col gap-4">
            <div className="text-[12.5px] text-muted leading-relaxed">
              {vi ? "Chọn bạn bè để mời vào nhóm chat này." : "Select friends to invite to this group chat."}
            </div>

            <SearchBox
              value={inviteSearch}
              onChange={(e) => setInviteSearch(e.target.value)}
              onClear={() => setInviteSearch("")}
              placeholder={vi ? "Tìm bạn bè…" : "Search friends…"}
              className="mb-2"
            />

            <div className="max-h-[200px] overflow-y-auto flex flex-col border border-border rounded-xl divide-y divide-border/30 bg-surface-1">
              {friends
                .filter((f) => !members.some((m) => m.id === f.id))
                .filter((f) => !inviteSearch.trim() || f.name.toLowerCase().includes(inviteSearch.toLowerCase()))
                .map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between gap-3 p-2.5 hover:bg-surface-2 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar spec={{ hue: friend.hue, initials: friend.initials, img: friend.avatar }} size={32} />
                      <div className="min-w-0 flex-1 text-[13px] font-semibold text-text truncate">
                        {friend.name}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await api.post(`/bots/zalo/${account.phone}/conversations/${convo.id}/members`, { userId: friend.id });
                          showToast(vi ? `Đã mời ${friend.name} thành công!` : `Successfully invited ${friend.name}!`, "success");
                          void fetchParticipants();
                          setInviteModal(false);
                          setInviteSearch("");
                        } catch (err) {
                          console.error(err);
                          showToast(vi ? `Lỗi mời bạn bè: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
                        }
                      }}
                    >
                      {vi ? "Mời" : "Invite"}
                    </Button>
                  </div>
                ))}
              {friends.filter((f) => !members.some((m) => m.id === f.id)).filter((f) => !inviteSearch.trim() || f.name.toLowerCase().includes(inviteSearch.toLowerCase())).length === 0 && (
                <div className="p-8 text-center text-[12.5px] italic text-muted">
                  {vi ? "Không có bạn bè nào khả dụng để mời." : "No friends available to invite."}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => {
                  setInviteModal(false);
                  setInviteSearch("");
                }}
              >
                {vi ? "Hủy" : "Cancel"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {settingsModal && (
        <Modal
          title={vi ? "Cài đặt nhóm" : "Group Settings"}
          onClose={() => setSettingsModal(false)}
          width={400}
        >
          <div className="flex flex-col gap-4">
            <div className="text-[12.5px] text-muted leading-relaxed">
              {vi ? "Quản lý quyền hạn và chế độ hoạt động của các thành viên trong nhóm." : "Manage permissions and operations for group members."}
            </div>
            
            <div className="flex flex-col gap-3">
              <SettingToggle
                label={vi ? "Duyệt thành viên mới" : "Membership approval"}
                desc={vi ? "Chỉ admin mới duyệt được người vào nhóm" : "Require admin approval to join"}
                checked={Boolean(groupSettings.joinAppr)}
                onChange={(checked) => handleUpdateSetting("joinAppr", checked)}
              />
              <SettingToggle
                label={vi ? "Chặn đổi tên & ảnh nhóm" : "Lock name & avatar"}
                desc={vi ? "Chỉ trưởng/phó nhóm mới được đổi tên và ảnh" : "Only admin can rename and change avatar"}
                checked={Boolean(groupSettings.blockName)}
                onChange={(checked) => handleUpdateSetting("blockName", checked)}
              />
              <SettingToggle
                label={vi ? "Cho phép xem tin nhắn cũ" : "Allow reading history"}
                desc={vi ? "Thành viên mới vào được đọc các tin trước đó" : "New members can read past messages"}
                checked={Boolean(groupSettings.enableMsgHistory)}
                onChange={(checked) => handleUpdateSetting("enableMsgHistory", checked)}
              />
              <SettingToggle
                label={vi ? "Chặn thành viên nhắn tin" : "Block member messaging"}
                desc={vi ? "Chỉ trưởng/phó nhóm mới được nhắn tin" : "Only admin can send messages"}
                checked={Boolean(groupSettings.lockSendMsg)}
                onChange={(checked) => handleUpdateSetting("lockSendMsg", checked)}
              />
              <SettingToggle
                label={vi ? "Chặn ghim tin nhắn" : "Lock message pinning"}
                desc={vi ? "Chỉ trưởng/phó nhóm mới được ghim bài viết/bình chọn" : "Only admin can pin messages/polls"}
                checked={Boolean(groupSettings.setTopicOnly)}
                onChange={(checked) => handleUpdateSetting("setTopicOnly", checked)}
              />
              <SettingToggle
                label={vi ? "Chặn tạo bài viết, ghi chú" : "Lock post creation"}
                desc={vi ? "Chỉ trưởng/phó nhóm mới được tạo ghi chú" : "Only admin can create posts/notes"}
                checked={Boolean(groupSettings.lockCreatePost)}
                onChange={(checked) => handleUpdateSetting("lockCreatePost", checked)}
              />
              <SettingToggle
                label={vi ? "Chặn tạo bình chọn" : "Lock poll creation"}
                desc={vi ? "Chỉ trưởng/phó nhóm mới được tạo bình chọn" : "Only admin can create polls"}
                checked={Boolean(groupSettings.lockCreatePoll)}
                onChange={(checked) => handleUpdateSetting("lockCreatePoll", checked)}
              />
            </div>
            
            <div className="flex justify-end gap-2.5 pt-3 border-t border-border mt-2">
              <Button onClick={() => setSettingsModal(false)}>
                {vi ? "Đóng" : "Close"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {pendingModal && (
        <Modal
          title={`${vi ? "Yêu cầu chờ duyệt" : "Pending Approvals"} · ${pendingUsers.length}`}
          onClose={() => setPendingModal(false)}
          width={380}
        >
          <div className="flex flex-col gap-4">
            <div className="text-[12.5px] text-muted">
              {vi ? "Danh sách người dùng đang gửi yêu cầu tham gia nhóm." : "Users waiting for permission to join the group."}
            </div>

            <div className="max-h-[250px] overflow-y-auto flex flex-col border border-border rounded-xl divide-y divide-border/30 bg-surface-1">
              {pendingUsers.map((user) => {
                const initials = (user.dpn || "P")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                let hash = 0;
                const nameStr = user.dpn || "";
                for (let i = 0; i < nameStr.length; i++) {
                  hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
                }
                const hue = Math.abs(hash % 360);

                return (
                  <div key={user.uid} className="flex items-center justify-between gap-3 p-2.5 hover:bg-surface-2 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar spec={{ hue, initials, img: user.avatar }} size={32} />
                      <div className="min-w-0 flex-1 text-[13px] font-semibold text-text truncate">
                        {user.dpn || "Zalo User"}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            await api.post(`/bots/zalo/${account.phone}/conversations/${convo.id}/pending-members/review`, { userId: user.uid, approve: false });
                            setPendingUsers((prev) => prev.filter((u) => u.uid !== user.uid));
                            setPendingCount((c) => Math.max(0, c - 1));
                            showToast(vi ? "Đã từ chối yêu cầu tham gia!" : "Successfully declined request!", "success");
                          } catch (err) {
                            console.error(err);
                            showToast(vi ? `Lỗi từ chối: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
                          }
                        }}
                        className="rounded-lg bg-danger/10 hover:bg-danger/25 text-danger font-semibold px-2.5 py-1 text-xs cursor-pointer transition-colors"
                      >
                        {vi ? "Từ chối" : "Decline"}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await api.post(`/bots/zalo/${account.phone}/conversations/${convo.id}/pending-members/review`, { userId: user.uid, approve: true });
                            setPendingUsers((prev) => prev.filter((u) => u.uid !== user.uid));
                            setPendingCount((c) => Math.max(0, c - 1));
                            void fetchParticipants();
                            showToast(vi ? "Đã duyệt thành viên thành công!" : "Successfully approved member!", "success");
                          } catch (err) {
                            console.error(err);
                            showToast(vi ? `Lỗi duyệt: ${(err as Error).message}` : `Error: ${(err as Error).message}`, "error");
                          }
                        }}
                        className="rounded-lg bg-accent-dim hover:bg-accent/20 text-accent font-semibold px-2.5 py-1 text-xs cursor-pointer transition-colors"
                      >
                        {vi ? "Duyệt" : "Approve"}
                      </button>
                    </div>
                  </div>
                );
              })}
              {pendingUsers.length === 0 && (
                <div className="p-8 text-center text-[12.5px] italic text-muted">
                  {vi ? "Không có yêu cầu nào." : "No pending approvals found."}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <Button onClick={() => setPendingModal(false)}>
                {vi ? "Đóng" : "Close"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmModal && (
        <Modal
          title={confirmModal.title}
          onClose={() => setConfirmModal(null)}
          width={380}
        >
          <div className="flex flex-col gap-4">
            <div className="text-[13px] text-muted leading-relaxed">
              {confirmModal.message}
            </div>
            <div className="flex justify-end gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setConfirmModal(null)}
              >
                {vi ? "Hủy" : "Cancel"}
              </Button>
              <Button
                variant={confirmModal.variant || "primary"}
                onClick={() => {
                  void confirmModal.onConfirm();
                }}
              >
                {vi ? "Đồng ý" : "Confirm"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function MemberRow({
  member,
  isBotAdmin,
  isBotOwner,
  onRemove,
  onPromote,
  onDemote,
  onChangeOwner,
  vi,
}: {
  readonly member: GroupMember & { id: string; role?: string; isOwner?: boolean; isAdmin?: boolean };
  readonly isBotAdmin: boolean;
  readonly isBotOwner: boolean;
  readonly onRemove: (uid: string) => Promise<void>;
  readonly onPromote: (uid: string) => Promise<void>;
  readonly onDemote: (uid: string) => Promise<void>;
  readonly onChangeOwner: (uid: string) => Promise<void>;
  readonly vi: boolean;
}): JSX.Element {
  const [showMenu, setShowMenu] = useState(false);

  const isSelf = member.admin;
  
  let canManage = false;
  if (!isSelf) {
    if (isBotOwner) {
      canManage = true;
    } else if (isBotAdmin && member.role === 'member') {
      canManage = true;
    }
  }

  const roleText = member.role === 'owner' 
    ? (vi ? "Trưởng nhóm" : "Owner") 
    : member.role === 'deputy' 
    ? (vi ? "Phó nhóm" : "Deputy") 
    : null;

  return (
    <div className="relative flex items-center gap-3 p-[6px_2px]">
      <Avatar spec={{ hue: member.hue, initials: member.initials, img: member.avatar }} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[13px] font-semibold text-text">{member.name}</span>
          {isSelf && (
            <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[9.5px] font-bold text-muted uppercase tracking-wide shrink-0">
              {vi ? "Bạn" : "You"}
            </span>
          )}
        </div>
        {roleText && (
          <div className="text-[11px] text-accent font-medium mt-px">{roleText}</div>
        )}
      </div>

      {canManage && (
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-surface-1 text-muted hover:text-text cursor-pointer hover:border-accent-border transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-50 min-w-[150px] rounded-xl border border-border bg-surface shadow-2xl p-1 flex flex-col gap-0.5 animate-fade-in">
                {isBotOwner && member.role === 'member' && (
                  <button
                    onClick={() => { setShowMenu(false); void onPromote(member.id); }}
                    className="w-full text-left rounded-lg px-3 py-2 text-[12.5px] font-medium text-text hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    {vi ? "Thêm phó nhóm" : "Promote to deputy"}
                  </button>
                )}
                {isBotOwner && member.role === 'deputy' && (
                  <button
                    onClick={() => { setShowMenu(false); void onDemote(member.id); }}
                    className="w-full text-left rounded-lg px-3 py-2 text-[12.5px] font-medium text-text hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    {vi ? "Gỡ phó nhóm" : "Demote deputy"}
                  </button>
                )}
                {isBotOwner && (
                  <button
                    onClick={() => { setShowMenu(false); void onChangeOwner(member.id); }}
                    className="w-full text-left rounded-lg px-3 py-2 text-[12.5px] font-medium text-text hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    {vi ? "Chuyển trưởng nhóm" : "Transfer ownership"}
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); void onRemove(member.id); }}
                  className="w-full text-left rounded-lg px-3 py-2 text-[12.5px] font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                >
                  {vi ? "Xóa khỏi nhóm" : "Remove from group"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SettingToggle({
  label,
  desc,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly desc: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-semibold text-text truncate">{label}</span>
        <span className="text-[11px] text-muted leading-tight">{desc}</span>
      </div>
      <Toggle on={checked} onChange={onChange} />
    </div>
  );
}

function Label({ children }: { readonly children: React.ReactNode }): JSX.Element {
  return <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{children}</div>;
}

function Row({ label, value, accent = false }: { readonly label: string; readonly value: string; readonly accent?: boolean }): JSX.Element {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${accent ? "text-accent" : "text-text"}`}>{value}</span>
    </div>
  );
}

