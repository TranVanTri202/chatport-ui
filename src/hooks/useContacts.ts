import { useCallback, useEffect, useMemo, useState } from "react";
import type { Friend, FriendRequest } from "@/types";
import { api } from "@/lib/api";
import { useAppContext } from "@/providers/AppProvider";

export interface UseContactsResult {
  readonly friends: ReadonlyArray<Friend>;
  readonly requests: ReadonlyArray<FriendRequest>;
  readonly sentRequests: ReadonlyArray<FriendRequest>;
  readonly grouped: ReadonlyArray<readonly [string, ReadonlyArray<Friend>]>;
  setQuery: (q: string) => void;
  readonly query: string;
  accept: (req: FriendRequest) => void;
  decline: (req: FriendRequest) => void;
  cancelSent: (req: FriendRequest) => void;
  remove: (friend: Friend) => void;
  sendRequest: (userId: string, message?: string) => Promise<void>;
  changeAlias: (friendId: string, alias: string) => Promise<void>;
  removeAlias: (friendId: string) => Promise<void>;
}

/** Logic for the contacts screen: filtering, alphabetical grouping, accept/decline. */
export function useContacts(accountPhone?: string): UseContactsResult {
  const { socket } = useAppContext();
  const [friends, setFriends] = useState<ReadonlyArray<Friend>>([]);
  const [requests, setRequests] = useState<ReadonlyArray<FriendRequest>>([]);
  const [sentRequests, setSentRequests] = useState<ReadonlyArray<FriendRequest>>([]);
  const [query, setQuery] = useState("");

  const loadContacts = useCallback(async () => {
    if (!accountPhone) {
      setFriends([]);
      setRequests([]);
      setSentRequests([]);
      return;
    }
    try {
      const contactsRes = await api.get<any[]>(`/bots/zalo/${accountPhone}/contacts`);
      const requestsRes = await api.get<any[]>(`/bots/zalo/${accountPhone}/contacts/requests`);
      const sentRequestsRes = await api.get<any[]>(`/bots/zalo/${accountPhone}/contacts/sent-requests`);

      const mappedFriends: Friend[] = contactsRes.map((c) => {
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
          online: c.isOnline ?? false,
          nick: c.nickName || undefined,
          phone: c.phone || undefined,
          avatar: c.avatar || undefined,
          cover: c.cover || undefined,
          gender: c.gender ?? undefined,
          dob: c.dob || undefined,
          signature: c.signature || undefined,
          zaloName: c.zaloName || undefined,
        };
      });

      const mappedRequests: FriendRequest[] = requestsRes.map((r) => {
        const initials = (r.name || "FR")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        let hash = 0;
        const nameStr = r.name || "";
        for (let i = 0; i < nameStr.length; i++) {
          hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);

        return {
          id: String(r.id),
          externalId: r.externalId,
          name: r.name,
          initials,
          hue,
          source: r.source || "Zalo Request",
          avatar: r.avatar || undefined,
        };
      });

      const mappedSentRequests: FriendRequest[] = sentRequestsRes.map((r) => {
        const initials = (r.displayName || "SR")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        let hash = 0;
        const nameStr = r.displayName || "";
        for (let i = 0; i < nameStr.length; i++) {
          hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);

        return {
          id: String(r.userId),
          name: r.displayName,
          initials,
          hue,
          source: r.message || "Sent Request",
          avatar: r.avatar || undefined,
        };
      });

      setFriends(mappedFriends);
      setRequests(mappedRequests);
      setSentRequests(mappedSentRequests);
    } catch (err) {
      console.error("Failed to load contacts/requests:", err);
    }
  }, [accountPhone]);

  useEffect(() => {
    void loadContacts();
    setQuery("");
  }, [loadContacts]);

  useEffect(() => {
    if (!socket) return;

    const handleContactsUpdated = () => {
      void loadContacts();
    };

    socket.on("contacts:updated", handleContactsUpdated);
    return () => {
      socket.off("contacts:updated", handleContactsUpdated);
    };
  }, [socket, loadContacts]);

  const grouped = useMemo<ReadonlyArray<readonly [string, ReadonlyArray<Friend>]>>(() => {
    const q = query.trim().toLowerCase();
    const filtered = friends.filter((f) =>
      !q || `${f.name} ${f.nick ?? ""} ${f.phone ?? ""}`.toLowerCase().includes(q),
    );
    const map = new Map<string, Friend[]>();
    for (const f of filtered) {
      const letter = (f.name.trim()[0] ?? "#").toUpperCase();
      const bucket = map.get(letter);
      if (bucket) bucket.push(f);
      else map.set(letter, [f]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [friends, query]);

  const accept = useCallback(async (req: FriendRequest) => {
    if (!accountPhone) return;
    try {
      const newContact = await api.post<any>(`/bots/zalo/${accountPhone}/contacts/requests/${req.id}/accept`);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setFriends((prev) => [
        ...prev,
        { id: newContact.externalId, name: req.name, initials: req.initials, hue: req.hue, online: false, avatar: req.avatar },
      ]);
    } catch (e) {
      console.error("Failed to accept request:", e);
    }
  }, [accountPhone]);

  const decline = useCallback(async (req: FriendRequest) => {
    if (!accountPhone) return;
    try {
      await api.post(`/bots/zalo/${accountPhone}/contacts/requests/${req.id}/decline`);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (e) {
      console.error("Failed to decline request:", e);
    }
  }, [accountPhone]);

  const cancelSent = useCallback(async (req: FriendRequest) => {
    if (!accountPhone) return;
    try {
      await api.post(`/bots/zalo/${accountPhone}/contacts/sent-requests/${req.id}/cancel`);
      setSentRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (e) {
      console.error("Failed to cancel sent request:", e);
    }
  }, [accountPhone]);

  const remove = useCallback(async (friend: Friend) => {
    if (!accountPhone) return;
    try {
      await api.delete(`/bots/zalo/${accountPhone}/contacts/${friend.id}`);
      setFriends((prev) => prev.filter((f) => f.id !== friend.id));
    } catch (e) {
      console.error("Failed to remove friend:", e);
    }
  }, [accountPhone]);

  const sendRequest = useCallback(async (userId: string, message?: string) => {
    if (!accountPhone) return;
    try {
      await api.post(`/bots/zalo/${accountPhone}/contacts/add-friend`, { userId, message });
      void loadContacts();
    } catch (e) {
      console.error("Failed to send friend request:", e);
    }
  }, [accountPhone, loadContacts]);

  const changeAlias = useCallback(async (friendId: string, alias: string) => {
    if (!accountPhone) return;
    try {
      await api.patch(`/bots/zalo/${accountPhone}/contacts/${friendId}/alias`, { alias });
      // Cập nhật tên trong local state ngay lập tức
      setFriends((prev) =>
        prev.map((f) => f.id === friendId ? { ...f, name: alias } : f)
      );
    } catch (e) {
      console.error("Failed to change friend alias:", e);
    }
  }, [accountPhone]);

  const removeAlias = useCallback(async (friendId: string) => {
    if (!accountPhone) return;
    try {
      const res = await api.delete<{ ok: boolean; name: string }>(`/bots/zalo/${accountPhone}/contacts/${friendId}/alias`);
      // Khôi phục tên gốc trong local state
      setFriends((prev) =>
        prev.map((f) => f.id === friendId ? { ...f, name: res.name ?? f.name } : f)
      );
    } catch (e) {
      console.error("Failed to remove friend alias:", e);
    }
  }, [accountPhone]);

  return { friends, requests, sentRequests, grouped, query, setQuery, accept, decline, cancelSent, remove, sendRequest, changeAlias, removeAlias };
}
