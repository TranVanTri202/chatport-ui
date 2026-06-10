/** Domain types shared across the app. Strongly typed — no `any` anywhere. */

export type Language = "vi" | "en";
export type ThemeMode = "dark" | "light";
export type AccentKey = "green" | "indigo" | "blue";
export type DashboardLayout = "grid" | "table" | "group";

/** Lifecycle state of a managed Zalo bot account. */
export type AccountStatus = "online" | "syncing" | "offline" | "expired";

export type ModelName = "Claude Haiku" | "Claude Sonnet";

export interface AvatarSpec {
  /** HSL hue (0–360) used to derive the tonal avatar tile. */
  readonly hue: number;
  readonly initials: string;
  /** Optional user-uploaded image (object URL or remote src). */
  readonly img?: string;
}

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly avatar: AvatarSpec;
  readonly status: AccountStatus;
  readonly auto: boolean;
  readonly unread: number;
  readonly today: number;
  readonly aiToday: number;
  readonly lastActive: string;
  readonly model: ModelName;
  /** Key into the conversations map. */
  readonly convos: string;
  readonly friendsCount?: number;
  readonly requestsCount?: number;
}

export type ConversationType = "direct" | "group";

export interface Conversation {
  readonly id: string;
  readonly type: ConversationType;
  readonly name: string;
  readonly initials: string;
  readonly hue: number;
  readonly last: string;
  readonly time: string;
  readonly unread: number;
  readonly auto: boolean;
  readonly thread: string | null;
  readonly online?: boolean;
  /** Human-friendly presence string, e.g. "5 phút trước" or "Đang hoạt động". */
  readonly presenceText?: string;
  readonly members?: number;
  readonly phone?: string;
  readonly nick?: string;
  readonly friend?: boolean;
  /** Runtime overrides (renamed group, new group photo). */
  readonly avatarImg?: string;
  readonly pinnedMessages?: any[];
  readonly metadata?: any;
}

export type MessageSender = "them" | "me" | "ai";
export type MessageKind = "text" | "image" | "file" | "video" | "voice" | "event" | "card" | "location";

export interface MessageReaction {
  readonly userId: string;
  readonly userName: string;
  readonly reaction: string;
}

export interface Message {
  readonly id: string;
  readonly messageExternalId?: string;
  readonly from: MessageSender;
  readonly kind: MessageKind;
  readonly time: string;
  readonly text?: string;
  /** Group member display name for `them` messages. */
  readonly who?: string;
  readonly img?: string;
  readonly fileName?: string;
  readonly fileSize?: string;
  readonly videoUrl?: string;
  readonly voiceUrl?: string;
  readonly card?: {
    readonly title: string;
    readonly thumb: string;
    readonly userId: string;
    readonly phone?: string;
    readonly qrCodeUrl?: string;
  };
  readonly location?: {
    readonly title: string;
    readonly description: string;
    readonly latitude: string;
    readonly longitude: string;
    readonly url: string;
  };
  readonly reactions?: ReadonlyArray<MessageReaction>;
  readonly isRecalled?: boolean;
  readonly raw?: any;
}

export interface ReferenceDoc {
  readonly id: string;
  readonly type: "sheet" | "doc" | "link";
  readonly name: string;
  readonly meta: string;
}

export interface AutoReplyConfig {
  readonly enabled: boolean;
  readonly prompt: string;
  readonly docs: ReadonlyArray<ReferenceDoc>;
  readonly model: ModelName;
  readonly hours: string;
  readonly fallback: ReadonlyArray<string>;
}

export interface Friend {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly hue: number;
  readonly online: boolean;
  readonly nick?: string;
  readonly phone?: string;
  readonly avatar?: string;
  readonly cover?: string;
  readonly gender?: number;
  readonly dob?: string;
  readonly signature?: string;
  readonly zaloName?: string;
}

export interface FriendRequest {
  readonly id: string;
  readonly externalId?: string;
  readonly name: string;
  readonly initials: string;
  readonly hue: number;
  readonly source: string;
  readonly avatar?: string;
}

export interface ContactBook {
  readonly requests: ReadonlyArray<FriendRequest>;
  readonly friends: ReadonlyArray<Friend>;
}

export interface GroupMember {
  readonly name: string;
  readonly initials: string;
  readonly hue: number;
  readonly admin?: boolean;
  readonly avatar?: string;
}

/** App-wide UI preferences (persisted, surfaced via the Tweaks panel). */
export interface Preferences {
  readonly lang: Language;
  readonly theme: ThemeMode;
  readonly accent: AccentKey;
  readonly dashLayout: DashboardLayout;
  readonly density: "compact" | "regular";
}
