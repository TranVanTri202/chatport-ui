"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Conversation, Message, MessageKind } from "@/types";
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
  sendVoice: (file: File) => void;
  sendVideo: (file: File, caption?: string) => void;
  reactToMessage: (messageExternalId: string, reactIcon: string) => Promise<void>;
  recallMessage: (messageExternalId: string) => Promise<void>;
  sendTypingStatus: (isTyping: boolean) => void;
  pinMessage: (messageExternalId: string) => Promise<void>;
  unpinMessage: (topicId: string) => Promise<void>;
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
          pinnedMessages: (c.metadata as any)?.pinnedMessages || [],
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
        let voiceUrl: string | undefined = undefined;

        let kind: MessageKind = "text";
        if (m.type === "image") kind = "image";
        else if (m.type === "video") kind = "video";
        else if (m.type === "voice") kind = "voice";
        else if (m.type === "file") kind = "file";
        else if (m.type === "pin") {
          kind = "event";
        } else if (m.type === "unknown") {
          try {
            const rawObj = typeof m.raw === "string" ? JSON.parse(m.raw) : m.raw;
            if (rawObj && (rawObj.isSystemPin || rawObj.isFriendEvent)) {
              kind = "event";
            }
          } catch (e) {}
        }

        let card: any = undefined;
        let location: any = undefined;
        if (m.attachments && m.attachments.length > 0) {
          const first = m.attachments[0];
          if (kind === "image" || first.type === "image") {
            kind = "image";
            img = first.url;
          } else if (kind === "video" || first.type === "video") {
            kind = "video";
            videoUrl = first.url;
          } else if (kind === "voice" || first.type === "voice") {
            kind = "voice";
            voiceUrl = first.url;
          } else if (kind === "file" || first.type === "file") {
            kind = "file";
            fileName = first.name || "Attachment";
            const bytes = Number(first.size);
            if (!isNaN(bytes) && first.size !== null && first.size !== undefined) {
              if (bytes < 1024) fileSize = `${bytes} B`;
              else if (bytes < 1024 * 1024) fileSize = `${(bytes / 1024).toFixed(1)} KB`;
              else fileSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            } else {
              fileSize = first.size || "Unknown size";
            }
          } else if (first.type === "link" && first.meta && first.meta.isCard) {
            kind = "card";
            card = {
              title: first.meta.title || "",
              thumb: first.meta.thumb || "",
              userId: first.meta.userId || "",
              phone: first.meta.phone || "",
              qrCodeUrl: first.meta.qrCodeUrl || "",
            };
          } else if (first.type === "link" && first.meta && first.meta.isLocation) {
            kind = "location";
            location = {
              title: first.meta.title || "Vị trí",
              description: first.meta.description || "",
              latitude: first.meta.latitude || "",
              longitude: first.meta.longitude || "",
              url: first.url || "",
            };
          }
        }

        let reactions: any[] = [];
        if (m.reactions) {
          try {
            reactions = typeof m.reactions === "string" ? JSON.parse(m.reactions) : m.reactions;
          } catch (e) {
            console.error("Failed to parse reactions:", e);
          }
        }

        let isRecalled = false;
        if (m.raw) {
          try {
            const rawObj = typeof m.raw === "string" ? JSON.parse(m.raw) : m.raw;
            if (rawObj && rawObj.isRecalled) {
              isRecalled = true;
            }
          } catch (e) {
            // ignore
          }
        }

        return {
          id: String(m.id),
          messageExternalId: m.messageExternalId,
          from: m.direction === "in" ? "them" : (m.senderExternalId === botExternalId ? "me" : "ai"),
          kind,
          time: formatTime(m.createdAt),
          text: m.text || undefined,
          img,
          fileName,
          fileSize,
          videoUrl,
          voiceUrl,
          card,
          location,
          reactions,
          isRecalled,
          raw: m.raw,
        };
      });
      setMessages(mappedMsgs.reverse());
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [botExternalId, activeId]);

  useEffect(() => {
    if (activeId && botExternalId) {
      api.get(`/bots/zalo/${botExternalId}/conversations/${activeId}`)
        .then(() => {
          void fetchConversations();
        })
        .catch((err) => {
          console.error("Failed to fetch conversation details:", err);
        });
    }
    void fetchMessages();
  }, [activeId, botExternalId, fetchMessages, fetchConversations]);

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
      if (data.messageId && String(data.messageId).startsWith("group-update-")) {
        void fetchConversations();
        return;
      }

      if (activeId && String(data.conversationId) === activeId) {
        let img: string | undefined = undefined;
        let fileName: string | undefined = undefined;
        let fileSize: string | undefined = undefined;
        let videoUrl: string | undefined = undefined;
        let voiceUrl: string | undefined = undefined;
        let kind: MessageKind = "text";

        if (data.type === "image") kind = "image";
        else if (data.type === "video") kind = "video";
        else if (data.type === "voice") kind = "voice";
        else if (data.type === "file") kind = "file";
        else if (data.type === "pin") {
          kind = "event";
        } else if (data.type === "unknown") {
          try {
            const rawObj = typeof data.raw === "string" ? JSON.parse(data.raw) : data.raw;
            if (rawObj && (rawObj.isSystemPin || rawObj.isFriendEvent)) {
              kind = "event";
            }
          } catch (e) {}
        }

        let card: any = undefined;
        let location: any = undefined;
        if (data.attachments && data.attachments.length > 0) {
          const first = data.attachments[0];
          if (kind === "image" || first.type === "image") {
            kind = "image";
            img = first.url;
          } else if (kind === "video" || first.type === "video") {
            kind = "video";
            videoUrl = first.url;
          } else if (kind === "voice" || first.type === "voice") {
            kind = "voice";
            voiceUrl = first.url;
          } else if (kind === "file" || first.type === "file") {
            kind = "file";
            fileName = first.name || "Attachment";
            const bytes = Number(first.size);
            if (!isNaN(bytes) && first.size !== null && first.size !== undefined) {
              if (bytes < 1024) fileSize = `${bytes} B`;
              else if (bytes < 1024 * 1024) fileSize = `${(bytes / 1024).toFixed(1)} KB`;
              else fileSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            } else {
              fileSize = first.size || "Unknown size";
            }
          } else if (first.type === "link" && first.meta && first.meta.isCard) {
            kind = "card";
            card = {
              title: first.meta.title || "",
              thumb: first.meta.thumb || "",
              userId: first.meta.userId || "",
              phone: first.meta.phone || "",
              qrCodeUrl: first.meta.qrCodeUrl || "",
            };
          } else if (first.type === "link" && first.meta && first.meta.isLocation) {
            kind = "location";
            location = {
              title: first.meta.title || "Vị trí",
              description: first.meta.description || "",
              latitude: first.meta.latitude || "",
              longitude: first.meta.longitude || "",
              url: first.url || "",
            };
          }
        }

        const newMsg: Message = {
          id: String(data.messageId),
          messageExternalId: data.messageExternalId,
          from: data.direction === "in" ? "them" : "me",
          kind,
          time: formatTime(new Date().toISOString()),
          text: data.text || undefined,
          img,
          fileName,
          fileSize,
          videoUrl,
          voiceUrl,
          card,
          location,
          reactions: [],
          raw: data.raw,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
      void fetchConversations();
    };

    const handleMessageReaction = (data: any) => {
      if (activeId && String(data.conversationId) === activeId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.messageExternalId === data.messageExternalId) {
              return {
                ...m,
                reactions: data.reactions,
              };
            }
            return m;
          })
        );
      }
    };

    const handleMessageRecalled = (data: any) => {
      if (activeId && String(data.conversationId) === activeId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.messageExternalId === data.messageExternalId) {
              return {
                ...m,
                isRecalled: true,
              };
            }
            return m;
          })
        );
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:reaction", handleMessageReaction);
    socket.on("message:recalled", handleMessageRecalled);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:reaction", handleMessageReaction);
      socket.off("message:recalled", handleMessageRecalled);
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
    if (!botExternalId || !active) return;

    try {
      const formData = new FormData();
      formData.append("botExternalId", botExternalId);
      formData.append("threadId", active.phone || "");
      formData.append("threadType", active.type === "group" ? "group" : "user");
      formData.append("file", file);

      await api.post("/messages/send/file", formData);
    } catch (error) {
      console.error("Failed to send file:", error);
    }
  }, [botExternalId, active]);

  const sendVoice = useCallback(async (file: File) => {
    if (!botExternalId || !active) return;

    try {
      const formData = new FormData();
      formData.append("botExternalId", botExternalId);
      formData.append("threadId", active.phone || "");
      formData.append("threadType", active.type === "group" ? "group" : "user");
      formData.append("file", file);

      await api.post("/messages/send/voice", formData);
    } catch (error) {
      console.error("Failed to send voice:", error);
    }
  }, [botExternalId, active]);

  const sendVideo = useCallback(async (file: File, caption?: string) => {
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

      await api.post("/messages/send/video", formData);
    } catch (error) {
      console.error("Failed to send video:", error);
    }
  }, [botExternalId, active]);

  const reactToMessage = useCallback(async (messageExternalId: string, reactIcon: string) => {
    if (!botExternalId || !active) return;

    try {
      await api.post("/messages/react", {
        botExternalId,
        threadId: active.phone,
        threadType: active.type === "group" ? "group" : "user",
        messageExternalId,
        reactIcon,
      });
    } catch (error) {
      console.error("Failed to react to message:", error);
    }
  }, [botExternalId, active]);

  const recallMessage = useCallback(async (messageExternalId: string) => {
    if (!botExternalId || !active) return;
    try {
      await api.post("/messages/recall", {
        botExternalId,
        threadId: active.phone,
        threadType: active.type === "group" ? "group" : "user",
        messageExternalId,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.messageExternalId === messageExternalId ? { ...m, isRecalled: true } : m
        )
      );
    } catch (error) {
      console.error("Failed to recall message:", error);
    }
  }, [botExternalId, active]);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (!socket || !botExternalId || !active) return;
    socket.emit("agent:typing", {
      botExternalId,
      threadId: active.phone,
      threadType: active.type === "group" ? "group" : "user",
      isTyping,
    });
  }, [socket, botExternalId, active]);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const pinMessage = useCallback(async (messageExternalId: string) => {
    if (!botExternalId || !active) return;
    try {
      await api.post("/messages/pin", {
        botExternalId,
        threadId: active.phone,
        threadType: active.type === "group" ? "group" : "user",
        messageExternalId,
      });
      void fetchConversations();
    } catch (error) {
      console.error("Failed to pin message:", error);
    }
  }, [botExternalId, active, fetchConversations]);

  const unpinMessage = useCallback(async (topicId: string) => {
    if (!botExternalId || !active) return;
    try {
      await api.post("/messages/unpin", {
        botExternalId,
        threadId: active.phone,
        topicId,
      });
      void fetchConversations();
    } catch (error) {
      console.error("Failed to unpin message:", error);
    }
  }, [botExternalId, active, fetchConversations]);

  return {
    conversations,
    active,
    messages,
    selectConversation,
    sendText,
    sendImage,
    sendFile,
    sendVoice,
    sendVideo,
    reactToMessage,
    recallMessage,
    sendTypingStatus,
    pinMessage,
    unpinMessage,
  };
}
