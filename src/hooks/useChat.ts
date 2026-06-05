"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Conversation, Message } from "@/types";
import { api } from "@/lib/api";
import { useAppContext } from "@/providers/AppProvider";

export interface UseChatResult {
  readonly conversations: ReadonlyArray<Conversation>;
  readonly active: Conversation | undefined;
  readonly messages: ReadonlyArray<Message>;
  selectConversation: (id: string) => void;
  sendText: (text: string) => void;
  sendImage: (file: File, caption?: string) => void;
  sendFile: (file: File) => void;
}

export function useChat(convoKey: string, initialConvoId?: string): UseChatResult {
  const { accounts, socket } = useAppContext();
  const account = useMemo(() => accounts.find((a) => a.id === convoKey), [accounts, convoKey]);
  const botExternalId = account?.phone;

  const [conversations, setConversations] = useState<ReadonlyArray<Conversation>>([]);
  const [activeId, setActiveId] = useState<string | undefined>(initialConvoId);
  const [messages, setMessages] = useState<ReadonlyArray<Message>>([]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const fetchConversations = useCallback(async () => {
    if (!botExternalId) return;
    try {
      const res = await api.get<{ items: any[] }>(`/bots/zalo/${botExternalId}/conversations`);
      const mappedConvos: Conversation[] = res.items.map((c) => {
        const initials = (c.title || "ST")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        
        let hash = 0;
        const nameStr = c.title || "";
        for (let i = 0; i < nameStr.length; i++) {
          hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);

        return {
          id: String(c.id),
          type: c.threadType === "group" ? "group" : "direct",
          name: c.title || "Stranger",
          initials,
          hue,
          last: c.lastMessageText || "",
          time: formatTime(c.lastMessageAt),
          unread: c.unread ?? 0,
          auto: c.autoReplyEnabled ?? true,
          thread: String(c.id),
          phone: c.threadExternalId,
          nick: c.title,
          friend: c.threadType === "user",
          members: c.threadType === "group" ? ((c.metadata as any)?.memberCount ?? 0) : undefined,
          avatarImg: c.avatar || undefined,
        };
      });
      setConversations(mappedConvos);
      
      const firstConvo = mappedConvos[0];
      if (initialConvoId && mappedConvos.some((c) => c.id === initialConvoId)) {
        setActiveId(initialConvoId);
      } else if (firstConvo && !activeId) {
        setActiveId(firstConvo.id);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, [botExternalId, activeId, initialConvoId]);

  useEffect(() => {
    void fetchConversations();
  }, [botExternalId, fetchConversations]);

  const fetchMessages = useCallback(async () => {
    if (!botExternalId || !activeId) {
      setMessages([]);
      return;
    }
    try {
      const res = await api.get<{ items: any[] }>(`/bots/zalo/${botExternalId}/conversations/${activeId}/messages`);
      const mappedMsgs: Message[] = res.items.map((m) => {
        let img: string | undefined = undefined;
        let fileName: string | undefined = undefined;
        let fileSize: string | undefined = undefined;
        let videoUrl: string | undefined = undefined;

        if (m.attachments && m.attachments.length > 0) {
          const first = m.attachments[0];
          if (m.type === "image") {
            img = first.url;
          } else if (m.type === "video") {
            videoUrl = first.url;
          } else if (m.type === "file") {
            fileName = first.name || "Attachment";
            fileSize = first.size || "Unknown size";
          }
        }

        return {
          id: String(m.id),
          from: m.direction === "in" ? "them" : (m.senderExternalId === botExternalId ? "me" : "ai"),
          kind: m.type === "image" ? "image" : m.type === "video" ? "video" : m.type === "file" ? "file" : "text",
          time: formatTime(m.createdAt),
          text: m.text || undefined,
          img,
          fileName,
          fileSize,
          videoUrl,
        };
      });
      setMessages(mappedMsgs.reverse());
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [botExternalId, activeId]);

  useEffect(() => {
    void fetchMessages();
  }, [activeId, fetchMessages]);

  useEffect(() => {
    if (!botExternalId || !activeId) return;
    const activeConvo = conversations.find((c) => c.id === activeId);
    if (activeConvo && activeConvo.unread > 0) {
      api.post(`/bots/zalo/${botExternalId}/conversations/${activeId}/read`)
        .then(() => {
          setConversations((prev) =>
            prev.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c))
          );
        })
        .catch((err) => console.error("Failed to mark conversation as read:", err));
    }
  }, [botExternalId, activeId, conversations]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      if (activeId && String(data.conversationId) === activeId) {
        let img: string | undefined = undefined;
        let fileName: string | undefined = undefined;
        let fileSize: string | undefined = undefined;
        let videoUrl: string | undefined = undefined;
        let kind: "text" | "image" | "file" | "video" = "text";

        if (data.attachments && data.attachments.length > 0) {
          const first = data.attachments[0];
          if (first.type === "image") {
            kind = "image";
            img = first.url;
          } else if (first.type === "video") {
            kind = "video";
            videoUrl = first.url;
          } else if (first.type === "file") {
            kind = "file";
            fileName = first.name || "Attachment";
            fileSize = first.size || "Unknown size";
          }
        }

        const newMsg: Message = {
          id: String(data.messageId),
          from: data.direction === "in" ? "them" : "me",
          kind,
          time: formatTime(new Date().toISOString()),
          text: data.text || undefined,
          img,
          fileName,
          fileSize,
          videoUrl,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
      void fetchConversations();
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, activeId, fetchConversations]);

  const sendText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !botExternalId || !active) return;

    try {
      await api.post("/messages/send/text", {
        botExternalId,
        threadId: active.phone,
        threadType: active.type === "group" ? "group" : "user",
        text: trimmed,
      });
    } catch (error) {
      console.error("Failed to send text:", error);
    }
  }, [botExternalId, active]);

  const sendImage = useCallback(async (file: File, caption?: string) => {
    if (!botExternalId || !active) return;

    try {
      const formData = new FormData();
      formData.append("botExternalId", botExternalId);
      formData.append("threadId", active.phone || "");
      formData.append("threadType", active.type === "group" ? "group" : "user");
      formData.append("file", file);
      if (caption?.trim()) {
        formData.append("caption", caption.trim());
      }

      await api.post("/messages/send/image", formData);
    } catch (error) {
      console.error("Failed to send image:", error);
    }
  }, [botExternalId, active]);

  const sendFile = useCallback(async (file: File) => {
    console.warn("File sending not fully implemented in backend yet", file);
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  return { conversations, active, messages, selectConversation, sendText, sendImage, sendFile };
}
