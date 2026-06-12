import type { Language } from "@/types";

/** Minimal i18n dictionary. Extend per feature; keep keys flat and typed. */
type Dict = Record<string, string>;

const VI: Dict = {
  overview: "Tổng quan hệ thống",
  overviewSub: "Toàn bộ tài khoản Zalo bạn đang quản lý",
  addAccount: "Thêm tài khoản",
  totalAccounts: "Tài khoản",
  activeNow: "Online",
  unreadTotal: "Chưa đọc",
  autoActive: "AI đang bật",
  repliesToday: "AI trả lời hôm nay",
  allAccounts: "Tất cả tài khoản",
  msgsToday: "Tin hôm nay",
  aiSent: "AI tự gửi",
  autoReply: "Tự trả lời",
  online: "Đang hoạt động",
  syncing: "Đang đồng bộ",
  offline: "Ngoại tuyến",
  expired: "Mất phiên",
  relogin: "Đăng nhập lại",
  expiredBanner: "bot mất phiên đăng nhập",
  expiredHint: "Cần đăng nhập lại để tiếp tục gửi tin & chạy AI",
  nav_dashboard: "Tổng quan",
  nav_chat: "Tin nhắn",
  nav_contacts: "Danh bạ",
  nav_autoreply: "Auto Reply",
  nav_accounts: "Tài khoản",
  nav_settings: "Cài đặt",
  nav_reports: "Báo cáo",
  appTag: "Trung tâm điều phối",
  nav_logout: "Đăng xuất",
};

const EN: Dict = {
  overview: "System overview",
  overviewSub: "All the Zalo accounts you are managing",
  addAccount: "Add account",
  totalAccounts: "Accounts",
  activeNow: "Online",
  unreadTotal: "Unread",
  autoActive: "AI enabled",
  repliesToday: "AI replies today",
  allAccounts: "All accounts",
  msgsToday: "Today",
  aiSent: "Sent by AI",
  autoReply: "Auto reply",
  online: "Online",
  syncing: "Syncing",
  offline: "Offline",
  expired: "Session expired",
  relogin: "Re-login",
  expiredBanner: "bot session expired",
  expiredHint: "Re-login to keep sending messages & running AI",
  nav_dashboard: "Overview",
  nav_chat: "Messages",
  nav_contacts: "Contacts",
  nav_autoreply: "Auto Reply",
  nav_accounts: "Accounts",
  nav_settings: "Settings",
  nav_reports: "Reports",
  appTag: "Operations console",
  nav_logout: "Logout",
};

const DICTS: Record<Language, Dict> = { vi: VI, en: EN };

export function translate(lang: Language, key: keyof typeof VI): string {
  return DICTS[lang][key] ?? VI[key] ?? key;
}
