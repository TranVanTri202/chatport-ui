"use client";

import { useEffect, useRef, useState } from "react";
import type { Account, Conversation, GroupMember } from "@/types";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";

type FriendState = "friend" | "none" | "pending";

/** Right-hand info panel: contact + friend actions (direct) or group management. */
export function ChatInfoPanel({ account, convo, vi }: { readonly account: Account; readonly convo: Conversation; readonly vi: boolean }): JSX.Element {
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
  const isFriend = fs === "friend";

  return (
    <>
      <div className="flex flex-col items-center gap-2.5 border-b border-border pb-[18px]">
        <Avatar spec={{ hue: convo.hue, initials: convo.initials, img: convo.avatarImg }} size={68} status={convo.online ? "online" : "offline"} />
        <div className="text-center">
          <div className="text-[15.5px] font-semibold">{convo.name}</div>
          {convo.nick ? <div className="mt-0.5 text-[12.5px] text-muted">~ {convo.nick}</div> : null}
          <div className="mt-1 text-xs text-muted">{convo.online ? (vi ? "Đang hoạt động" : "Online") : (convo.presenceText ?? (vi ? "Ngoại tuyến" : "Offline"))}</div>
        </div>
        {fs === "friend" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1.5 text-[12.5px] font-semibold text-accent"><Icon name="userCheck" size={14} /> {vi ? "Bạn bè" : "Friends"}</span>
        ) : fs === "none" ? (
          <Button size="sm" icon="userPlus" onClick={() => setFs("pending")}>{vi ? "Kết bạn" : "Add friend"}</Button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(245,176,66,.12)] px-3 py-1.5 text-[12.5px] font-semibold text-warning"><Icon name="clock" size={13} /> {vi ? "Đã gửi lời mời" : "Request sent"}</span>
            <button onClick={() => setFs("none")} className="text-xs text-muted underline">{vi ? "Thu hồi" : "Recall"}</button>
          </div>
        )}
      </div>

      <section className="border-b border-border py-4">
        <Label>{vi ? "Thông tin liên hệ" : "Contact info"}</Label>
        <div className="flex flex-col gap-3.5">
          <ContactRow icon="phone" label={vi ? "Số điện thoại" : "Phone"}>
            {isFriend ? <span className="text-[13px] font-semibold">{convo.phone}</span> : <span className="text-[12.5px] text-muted">•••• ••• ••• · {vi ? "Kết bạn để xem" : "Add friend to view"}</span>}
          </ContactRow>
          <ContactRow icon="users" label={vi ? "Biệt danh" : "Nickname"}><span className="text-[13px] font-semibold">{convo.nick ?? convo.name}</span></ContactRow>
          <ContactRow icon="info" label={vi ? "Nguồn" : "Source"}><span className={`text-[12.5px] ${isFriend ? "text-text" : "text-muted"}`}>{isFriend ? (vi ? "Danh bạ Zalo" : "Zalo contacts") : vi ? "Người lạ" : "Stranger"}</span></ContactRow>
        </div>
      </section>
    </>
  );
}

function GroupHeader({ account, convo, vi }: { readonly account: Account; readonly convo: Conversation; readonly vi: boolean }): JSX.Element {
  const [name, setName] = useState(convo.name);
  const [img, setImg] = useState<string | undefined>(convo.avatarImg);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(convo.name);
  const [modal, setModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => { setName(convo.name); setImg(convo.avatarImg); setEditing(false); }, [convo.id, convo.name, convo.avatarImg]);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const res = await api.get<{ items: any[] }>(
          `/bots/zalo/${account.phone}/conversations/${convo.id}/participants`
        );
        const mappedMembers: GroupMember[] = res.items.map((p) => {
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
            name: p.displayName || p.externalId,
            initials,
            hue,
            admin: p.isBot,
            avatar: p.avatar || undefined,
          };
        });
        setMembers(mappedMembers);
      } catch (error) {
        console.error("Failed to fetch group participants:", error);
      }
    };

    void fetchParticipants();
  }, [convo.id, account.phone]);

  const extra = 0; // Backend returns all participants, so no extra hidden ones

  return (
    <>
      <div className="flex flex-col items-center gap-2.5 border-b border-border pb-[18px]">
        <div className="relative">
          <Avatar spec={{ hue: convo.hue, initials: convo.initials, img }} size={68} />
          <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid h-[26px] w-[26px] place-items-center rounded-full border-[2.5px] border-surface-0 bg-accent text-[#0a1f16]"><Icon name="camera" size={13} /></button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImg(URL.createObjectURL(f)); e.target.value = ""; }} />
        </div>
        <div className="w-full text-center">
          {editing ? (
            <div className="flex items-center justify-center gap-1.5">
              <input value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setName(draft.trim() || name); setEditing(false); } }} className="max-w-[190px] rounded-[10px] border border-border bg-surface-2 p-[8px_10px] text-center text-text outline-none" />
              <button onClick={() => { setName(draft.trim() || name); setEditing(false); }} className="grid h-7 w-7 place-items-center rounded-[9px] border border-border"><Icon name="check" size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-[15.5px] font-semibold">
              {name}
              <button onClick={() => { setDraft(name); setEditing(true); }} className="flex p-0.5 text-muted"><Icon name="edit" size={13} /></button>
            </div>
          )}
          <div className="mt-1 text-xs text-muted">{members.length} {vi ? "thành viên" : "members"}</div>
        </div>
      </div>

      <section className="border-b border-border py-4">
        <div className="mb-2.5 flex items-center justify-between">
          <Label>{vi ? "Thành viên" : "Members"} · {members.length}</Label>
          <button onClick={() => setModal(true)} className="text-[12.5px] font-semibold text-accent">{vi ? "Xem tất cả" : "View all"}</button>
        </div>
        <div className="flex flex-col gap-0.5">
          {members.slice(0, 4).map((m, i) => <MemberRow key={i} member={m} vi={vi} />)}
        </div>
        <button onClick={() => setModal(true)} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-2.5 text-[13px] font-medium text-muted hover:border-accent-border hover:text-accent"><Icon name="userPlus" size={15} /> {vi ? "Thêm thành viên" : "Add member"}</button>
      </section>

      {modal ? (
        <Modal title={`${vi ? "Thành viên" : "Members"} · ${members.length}`} onClose={() => setModal(false)} width={380}>
          <div className="flex flex-col gap-0.5 overflow-y-auto">
            {members.map((m, i) => <MemberRow key={i} member={m} vi={vi} />)}
            {extra > 0 ? <div className="p-[10px_2px] text-[12.5px] italic text-muted">+ {extra} {vi ? "thành viên khác" : "more"}</div> : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function MemberRow({ member, vi }: { readonly member: GroupMember; readonly vi: boolean }): JSX.Element {
  return (
    <div className="flex items-center gap-3 p-[6px_2px]">
      <Avatar spec={{ hue: member.hue, initials: member.initials, img: member.avatar }} size={34} />
      <div className="min-w-0 flex-1 truncate text-[13px] font-semibold">{member.name}</div>
      {member.admin ? <span className="rounded-md bg-accent-dim px-2 py-0.5 text-[10.5px] font-semibold text-accent">{vi ? "Quản trị" : "Admin"}</span> : null}
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

function ContactRow({ icon, label, children }: { readonly icon: Parameters<typeof Icon>[0]["name"]; readonly label: string; readonly children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-border bg-surface-2 text-muted"><Icon name={icon} size={15} /></span>
      <div className="min-w-0 flex-1">
        <div className="mb-px text-[11px] text-muted">{label}</div>
        {children}
      </div>
    </div>
  );
}
