"use client";

import { useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useContacts } from "@/hooks/useContacts";
import { usePreferences } from "@/hooks/usePreferences";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SearchBox } from "@/components/ui/SearchBox";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

export function ContactsView(): JSX.Element {
  const { accounts } = useAccounts();
  const { preferences } = usePreferences();
  const vi = preferences.lang === "vi";
  const [selected, setSelected] = useState(accounts[0]?.id ?? "");
  const account = accounts.find((a) => a.id === selected) ?? accounts[0];
  const { grouped, requests, sentRequests, friends, query, setQuery, accept, decline } = useContacts(account?.phone);
  const [tab, setTab] = useState<"friends" | "requests" | "sent-requests">("friends");
  const [addModal, setAddModal] = useState(false);
  const handleStartChat = async (friend: any) => {
    if (!account) return;
    try {
      const conv = await api.post<any>(`/bots/zalo/${account.phone}/contacts/chat`, {
        userId: friend.id,
        displayName: friend.name,
        avatar: friend.avatar,
      });
      window.location.href = `/chat?account=${account.phone}&convo=${conv.id}`;
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  };

  if (!account) return <div />;

  return (
    <div className="grid h-full overflow-hidden [grid-template-columns:248px_1fr]">
      <aside className="flex min-h-0 flex-col border-r border-border bg-surface-0">
        <div className="border-b border-border p-[18px_16px_12px] text-[12.5px] font-semibold text-muted">{vi ? "Tài khoản" : "Accounts"}</div>
        <div className="flex flex-col gap-1 overflow-y-auto p-2">
          {accounts.map((a) => {
            return (
              <button key={a.id} onClick={() => setSelected(a.id)} className={`flex items-center gap-2.5 rounded-[10px] p-[8px_10px] text-left ${a.id === account.id ? "bg-accent-dim" : "hover:bg-surface-2"}`}>
                <Avatar spec={a.avatar} size={32} status={a.status} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold">{a.name}</div>
                  <div className="text-[11px] text-muted">{a.friendsCount ?? 0} {vi ? "bạn" : "friends"}</div>
                </div>
                {a.requestsCount && a.requestsCount > 0 ? <Badge n={a.requestsCount} /> : null}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="mx-auto w-full max-w-[820px] p-[22px_32px_0]">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[22px] font-semibold tracking-tight">{vi ? "Danh bạ" : "Contacts"}</h1>
            <Avatar spec={account.avatar} size={22} />
            <span className="text-[13px] text-muted">{account.name}</span>
          </div>
          <div className="my-2 flex items-center gap-3 pt-4">
            <div className="inline-flex gap-0.5 rounded-[10px] border border-border bg-surface-2 p-[3px]">
              <button onClick={() => setTab("friends")} className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium ${tab === "friends" ? "bg-surface-3 text-text" : "text-muted"}`}>{vi ? "Bạn bè" : "Friends"} · {friends.length}</button>
              <button onClick={() => setTab("requests")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium ${tab === "requests" ? "bg-surface-3 text-text" : "text-muted"}`}>
                {vi ? "Lời mời nhận" : "Received"} {requests.length > 0 ? <Badge n={requests.length} /> : null}
              </button>
              <button onClick={() => setTab("sent-requests")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium ${tab === "sent-requests" ? "bg-surface-3 text-text" : "text-muted"}`}>
                {vi ? "Lời mời đã gửi" : "Sent"} {sentRequests.length > 0 ? <Badge n={sentRequests.length} /> : null}
              </button>
            </div>
            {tab === "friends" ? (
              <div className="flex items-center gap-2 flex-1 max-w-[420px]">
                <SearchBox className="flex-1" value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} placeholder={vi ? "Tìm bạn bè…" : "Search…"} />
                <Button size="sm" icon="plus" onClick={() => setAddModal(true)}>{vi ? "Tìm qua SĐT" : "Search by Phone"}</Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[820px] p-[6px_32px_50px]">
            {tab === "friends" ? (
              grouped.length === 0 ? <Empty text={vi ? "Không tìm thấy bạn bè." : "No friends found."} /> : grouped.map(([letter, list]) => (
                <div key={letter}>
                  <div className="p-[16px_6px_6px] text-xs font-bold tracking-wide text-accent">{letter}</div>
                  {list.map((f, i) => (
                    <button
                      key={`${f.name}-${i}`}
                      onClick={() => handleStartChat(f)}
                      className="flex w-full items-center gap-3 rounded-xl p-[10px_12px] text-left hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <Avatar spec={{ hue: f.hue, initials: f.initials, img: f.avatar }} size={42} status={f.online ? "online" : "offline"} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold">{f.name}</div>
                        <div className="truncate text-xs text-muted">{f.nick ? `~ ${f.nick}` : vi ? "Bạn bè" : "Friend"}{f.phone ? ` · ${f.phone}` : ""}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            ) : tab === "requests" ? (
              requests.length === 0 ? (
                <Empty text={vi ? "Không có lời mời kết bạn." : "No requests."} />
              ) : (
                <div className="flex flex-col gap-2.5 pt-2.5">
                  {requests.map((r, i) => (
                    <div key={`${r.name}-${i}`} className="flex items-center gap-3 rounded-card border border-border bg-surface p-[13px_16px]">
                      <Avatar spec={{ hue: r.hue, initials: r.initials, img: r.avatar }} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{r.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><Icon name="userPlus" size={12} /> {vi ? "Muốn kết bạn" : "Wants to connect"} · {r.source}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => decline(r)}>{vi ? "Từ chối" : "Decline"}</Button>
                      <Button size="sm" icon="check" onClick={() => accept(r)}>{vi ? "Đồng ý" : "Accept"}</Button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              sentRequests.length === 0 ? (
                <Empty text={vi ? "Không có lời mời kết bạn đã gửi." : "No sent requests."} />
              ) : (
                <div className="flex flex-col gap-2.5 pt-2.5">
                  {sentRequests.map((r, i) => (
                    <div key={`${r.name}-${i}`} className="flex items-center gap-3 rounded-card border border-border bg-surface p-[13px_16px]">
                      <Avatar spec={{ hue: r.hue, initials: r.initials, img: r.avatar }} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{r.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><Icon name="userPlus" size={12} /> {vi ? "Lời nhắn" : "Greeting"} · {r.source}</div>
                      </div>
                      <span className="text-xs text-muted font-medium italic">{vi ? "Đang chờ phản hồi" : "Pending response"}</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
        {addModal && account ? (
          <Modal title={vi ? "Tìm kiếm & Thêm bạn bè" : "Search & Add Friends"} onClose={() => setAddModal(false)} width={380}>
            <SearchPhoneModal accountPhone={account.phone} onClose={() => setAddModal(false)} vi={vi} />
          </Modal>
        ) : null}
      </section>
    </div>
  );
}

function SearchPhoneModal({ accountPhone, onClose, vi }: { readonly accountPhone: string; readonly onClose: () => void; readonly vi: boolean }): JSX.Element {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(vi ? "Xin chào! Mình kết bạn nhé." : "Hi! Let's connect.");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone) return;
    setLoading(true);
    setError("");
    setResult(null);
    setRequestSent(false);
    try {
      const res = await api.get<any>(`/bots/zalo/${accountPhone}/contacts/search/${cleanPhone}`);
      if (res) {
        setResult(res);
      } else {
        setError(vi ? "Không tìm thấy tài khoản với số điện thoại này." : "No Zalo account found for this phone number.");
      }
    } catch (err) {
      setError(vi ? "Lỗi tìm kiếm hoặc số điện thoại không hợp lệ." : "Search failed or invalid phone number.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!result) return;
    setLoading(true);
    try {
      await api.post(`/bots/zalo/${accountPhone}/contacts/add-friend`, {
        userId: result.uid,
        message: inviteMsg,
      });
      setRequestSent(true);
    } catch (err) {
      setError(vi ? "Gửi lời mời kết bạn thất bại." : "Failed to send friend request.");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const conv = await api.post<any>(`/bots/zalo/${accountPhone}/contacts/chat`, {
        userId: result.uid,
        displayName: result.displayName || result.zaloName || "Zalo User",
        avatar: result.avatar,
      });
      onClose();
      window.location.href = `/chat?account=${accountPhone}&convo=${conv.id}`;
    } catch (err) {
      setError(vi ? "Tạo cuộc hội thoại thất bại." : "Failed to start conversation.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={vi ? "Nhập số điện thoại..." : "Enter phone number..."}
          className="flex-1 rounded-[10px] border border-border bg-surface-2 p-[8px_14px] text-sm text-text outline-none focus:border-accent-border"
          disabled={loading}
          autoFocus
        />
        <Button size="sm" type="submit" disabled={loading}>{vi ? "Tìm" : "Search"}</Button>
      </form>

      {error ? (
        <div className="rounded-xl bg-danger/10 p-3 text-xs text-danger flex items-center gap-2">
          <Icon name="alert" size={14} />
          {error}
        </div>
      ) : null}

      {loading && !result ? (
        <div className="p-8 text-center text-sm text-muted">{vi ? "Đang tìm kiếm..." : "Searching..."}</div>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <Avatar spec={{ hue: 200, initials: "Z", img: result.avatar }} size={48} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">{result.displayName || result.zaloName || "Zalo User"}</div>
              <div className="text-xs text-muted">ID: {result.uid}</div>
            </div>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {!result.isFriend && !requestSent && (
              <div className="flex flex-col gap-1.5 w-full">
                <input
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                  placeholder={vi ? "Lời nhắn kết bạn..." : "Greeting..."}
                  className="rounded-lg border border-border bg-surface p-1.5 text-xs outline-none w-full"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={handleAddFriend} disabled={loading}>
                    {vi ? "Kết bạn" : "Add Friend"}
                  </Button>
                  <Button size="sm" icon="send" onClick={handleChat} disabled={loading}>
                    {vi ? "Nhắn tin" : "Message"}
                  </Button>
                </div>
              </div>
            )}

            {(result.isFriend || requestSent) && (
              <div className="flex items-center justify-between w-full">
                {result.isFriend ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                    <Icon name="userCheck" size={13} /> {vi ? "Bạn bè" : "Friends"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                    <Icon name="clock" size={13} /> {vi ? "Đã gửi lời mời" : "Request sent"}
                  </span>
                )}
                <Button size="sm" icon="send" onClick={handleChat} disabled={loading}>
                  {vi ? "Nhắn tin" : "Message"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Badge({ n }: { readonly n: number }): JSX.Element {
  return <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10.5px] font-semibold text-[#0a1f16]">{n}</span>;
}

function Empty({ text }: { readonly text: string }): JSX.Element {
  return <div className="p-[60px_20px] text-center text-[13px] italic text-muted">{text}</div>;
}
