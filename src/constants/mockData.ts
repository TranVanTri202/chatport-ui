import type {
  Account, AccentKey, AutoReplyConfig, Conversation, Friend,
  GroupMember, Message, Preferences,
} from "@/types";

export const DEFAULT_PREFERENCES: Preferences = {
  lang: "vi", theme: "dark", accent: "green", dashLayout: "grid", density: "regular",
};

export const ACCENTS: Record<AccentKey, { accent: string; dim: string; border: string }> = {
  green: { accent: "#5cc996", dim: "rgba(92,201,150,.13)", border: "rgba(92,201,150,.28)" },
  indigo: { accent: "#8b8be8", dim: "rgba(139,139,232,.13)", border: "rgba(139,139,232,.28)" },
  blue: { accent: "#5f9ed6", dim: "rgba(95,158,214,.13)", border: "rgba(95,158,214,.28)" },
};

export const ACCOUNTS: ReadonlyArray<Account> = [
  { id: "a1", name: "Shop Mỹ Phẩm Lan Anh", phone: "0901 234 567", avatar: { hue: 152, initials: "LA" }, status: "online", auto: true, unread: 12, today: 86, aiToday: 64, lastActive: "now", model: "Claude Sonnet", convos: "c-cosmetic" },
  { id: "a2", name: "CSKH Nội Thất Mộc", phone: "0912 888 222", avatar: { hue: 28, initials: "NM" }, status: "online", auto: true, unread: 5, today: 51, aiToday: 39, lastActive: "now", model: "Claude Sonnet", convos: "c-furniture" },
  { id: "a3", name: "Phòng Khám Nha Khoa Sài Gòn", phone: "0987 111 333", avatar: { hue: 200, initials: "NK" }, status: "syncing", auto: true, unread: 8, today: 33, aiToday: 21, lastActive: "2 phút", model: "Claude Haiku", convos: "c-dental" },
  { id: "a4", name: "Tuyển Dụng HR Connect", phone: "0933 456 789", avatar: { hue: 270, initials: "HR" }, status: "online", auto: false, unread: 3, today: 19, aiToday: 0, lastActive: "5 phút", model: "Claude Sonnet", convos: "c-hr" },
  { id: "a5", name: "Bất Động Sản An Phú", phone: "0978 654 321", avatar: { hue: 340, initials: "AP" }, status: "expired", auto: true, unread: 4, today: 0, aiToday: 0, lastActive: "3 giờ", model: "Claude Sonnet", convos: "c-realestate" },
  { id: "a6", name: "Cửa Hàng Trà Sữa BoBa", phone: "0905 222 444", avatar: { hue: 96, initials: "BB" }, status: "online", auto: true, unread: 21, today: 124, aiToday: 98, lastActive: "now", model: "Claude Haiku", convos: "c-boba" },
];

export const CONVERSATIONS: Readonly<Record<string, ReadonlyArray<Conversation>>> = {
  "c-cosmetic": [
    { id: "v1", type: "direct", name: "Nguyễn Thu Hà", initials: "TH", hue: 12, last: "Cho em hỏi serum này dùng sáng hay tối ạ?", time: "14:32", unread: 2, auto: true, online: true, thread: "th-cosmetic-1", phone: "0356 789 012", nick: "Hà Bống", friend: true },
    { id: "v2", type: "group", name: "Đơn Sỉ Tháng 6", initials: "S6", hue: 152, last: "AI: Dạ bên em báo giá sỉ như sau ạ…", time: "14:20", unread: 0, members: 48, auto: true, thread: "th-cosmetic-2" },
    { id: "v3", type: "direct", name: "Trần Minh Khoa", initials: "MK", hue: 210, last: "Ok shop, mình chốt đơn nhé", time: "13:58", unread: 0, auto: false, online: false, thread: null, phone: "0903 222 118", nick: "Khoa Trần", friend: false },
    { id: "v4", type: "direct", name: "Phạm Quỳnh", initials: "PQ", hue: 300, last: "Shipper giao chưa shop ơi?", time: "13:41", unread: 1, auto: true, online: true, thread: null, phone: "0978 555 401", nick: "Quỳnh Anh", friend: false },
  ],
  "c-furniture": [
    { id: "v1", type: "direct", name: "Hồ Ngọc Diệp", initials: "ND", hue: 28, last: "Bộ sofa gỗ óc chó còn hàng không shop?", time: "11:20", unread: 2, auto: true, online: true, thread: "th-furniture-1", phone: "0912 880 110", nick: "Diệp Hồ", friend: true },
    { id: "v2", type: "group", name: "Dự Án Chung Cư Sunrise", initials: "SR", hue: 200, last: "Bên em gửi báo giá trọn gói ạ", time: "10:42", unread: 0, members: 18, auto: true, thread: null },
  ],
  "c-dental": [
    { id: "v1", type: "direct", name: "Đỗ Thuý An", initials: "TA", hue: 200, last: "Niềng răng trong suốt giá bao nhiêu ạ?", time: "16:10", unread: 3, auto: true, online: true, thread: "th-dental-1", phone: "0977 224 119", nick: "An Đỗ", friend: false },
    { id: "v2", type: "direct", name: "Lương Bảo", initials: "LB", hue: 150, last: "Đặt lịch khám chiều mai giúp mình", time: "15:30", unread: 0, auto: true, online: false, thread: null, phone: "0905 778 220", nick: "Bảo Lương", friend: true },
  ],
  "c-hr": [
    { id: "v1", type: "group", name: "Ứng Viên Backend Q3", initials: "BE", hue: 270, last: "Anh ơi vị trí này còn tuyển không ạ?", time: "13:05", unread: 3, members: 64, auto: false, thread: "th-hr-1" },
    { id: "v2", type: "direct", name: "Ngô Hải Đăng", initials: "HĐ", hue: 230, last: "Em gửi CV qua đây được không ạ?", time: "12:20", unread: 0, auto: false, online: true, thread: null, phone: "0944 220 558", nick: "Đăng Ngô", friend: false },
  ],
  "c-realestate": [
    { id: "v1", type: "direct", name: "Phan Thị Mai", initials: "PM", hue: 340, last: "Căn 2 phòng ngủ view sông còn không anh?", time: "08:15", unread: 2, auto: true, online: false, thread: "th-real-1", phone: "0978 110 442", nick: "Mai Phan", friend: false },
    { id: "v2", type: "direct", name: "Đặng Quang", initials: "ĐQ", hue: 20, last: "Cho mình xin bảng giá phân khu A", time: "07:50", unread: 2, auto: true, online: false, thread: null, phone: "0903 668 211", nick: "Quang Đặng", friend: true },
  ],
  "c-boba": [
    { id: "v1", type: "direct", name: "Lê Hoàng Nam", initials: "HN", hue: 96, last: "Cho 2 ly trà sữa trân châu size L", time: "15:02", unread: 3, auto: true, online: true, thread: "th-boba-1", phone: "0938 111 252", nick: "Nam Lê", friend: true },
    { id: "v2", type: "group", name: "Ship Khu Quận 1", initials: "Q1", hue: 200, last: "Đơn 88k giao Pasteur nha", time: "14:55", unread: 0, members: 26, auto: true, thread: null },
    { id: "v3", type: "direct", name: "Vũ Thảo", initials: "VT", hue: 330, last: "Có topping kem cheese ko shop?", time: "14:40", unread: 1, auto: true, online: true, thread: null, phone: "0967 333 870", nick: "Thảo Vũ", friend: false },
  ],
};

export const THREADS: Readonly<Record<string, ReadonlyArray<Message>>> = {
  "th-cosmetic-1": [
    { id: "m1", from: "them", kind: "text", text: "Chào shop ạ 🌸", time: "14:28" },
    { id: "m2", from: "them", kind: "text", text: "Cho em hỏi serum vitamin C này dùng sáng hay tối ạ?", time: "14:32" },
    { id: "m3", from: "ai", kind: "text", text: "Dạ chào chị ạ! Serum Vitamin C nên dùng vào **buổi sáng** để chống oxy hoá ạ. Nhớ thoa kem chống nắng sau đó nhé 🌿", time: "14:32" },
    { id: "m4", from: "them", kind: "text", text: "Vậy lấy em combo luôn nhé", time: "14:34" },
  ],
  "th-cosmetic-2": [
    { id: "m1", from: "them", kind: "text", text: "Shop ơi cho bảng giá sỉ tháng này với", time: "14:18", who: "Đại lý Hải Phòng" },
    { id: "m2", from: "ai", kind: "text", text: "Dạ báo giá sỉ T6:\n• Serum Vit C: 145.000đ\n• Kem chống nắng: 120.000đ\nFreeship đơn từ 3 triệu ạ 🧾", time: "14:20" },
  ],
  "th-furniture-1": [
    { id: "m1", from: "them", kind: "text", text: "Bộ sofa gỗ óc chó còn hàng không shop?", time: "11:18" },
    { id: "m2", from: "ai", kind: "text", text: "Dạ còn ạ! Bộ 3 món **24.500.000đ**, hỗ trợ trả góp 0% và giao lắp tận nhà ạ.", time: "11:19" },
  ],
  "th-dental-1": [
    { id: "m1", from: "them", kind: "text", text: "Niềng răng trong suốt giá bao nhiêu ạ?", time: "16:08" },
    { id: "m2", from: "ai", kind: "text", text: "Dạ Invisalign dao động **35–60 triệu** tuỳ tình trạng. Mời anh/chị đến khám & chụp phim miễn phí nhé.", time: "16:09" },
  ],
  "th-hr-1": [
    { id: "m1", from: "them", kind: "text", text: "Anh ơi vị trí Backend còn tuyển không ạ?", time: "13:02", who: "Nguyễn Đức Anh" },
    { id: "m2", from: "me", kind: "text", text: "Chào em, vị trí vẫn mở nhé. Em gửi CV qua tuyendung@hrconnect.vn giúp anh!", time: "13:05" },
  ],
  "th-real-1": [
    { id: "m1", from: "them", kind: "text", text: "Căn 2 phòng ngủ view sông còn không anh?", time: "08:12" },
    { id: "m2", from: "them", kind: "text", text: "Tầm giá bao nhiêu vậy?", time: "08:15" },
  ],
  "th-boba-1": [
    { id: "m1", from: "them", kind: "text", text: "Cho 2 ly trà sữa trân châu size L", time: "15:00" },
    { id: "m2", from: "ai", kind: "text", text: "Dạ 2 ly size L là 70.000đ ạ. Anh thêm topping gì không ạ? 🧋", time: "15:01" },
  ],
};

export const AUTO_REPLY_CONFIGS: Readonly<Record<string, AutoReplyConfig>> = {
  a1: {
    enabled: true,
    prompt: "Bạn là trợ lý CSKH của Shop Mỹ Phẩm Lan Anh. Trả lời thân thiện, xưng 'em'. Tư vấn dựa trên bảng giá và tài liệu. Khi khách khiếu nại, chuyển cho nhân viên.",
    docs: [
      { id: "d1", type: "sheet", name: "Bảng giá sản phẩm T6.2025", meta: "Google Sheets · 184 dòng" },
      { id: "d2", type: "doc", name: "Hướng dẫn sử dụng & thành phần", meta: "Google Docs · 12 trang" },
      { id: "d3", type: "link", name: "Chính sách đổi trả", meta: "lananh.vn/doi-tra" },
    ],
    model: "Claude Sonnet", hours: "08:00 – 22:00", fallback: ["Khiếu nại / hoàn tiền", "Khách yêu cầu gặp người thật"],
  },
  a6: {
    enabled: true,
    prompt: "Bạn là nhân viên order quán trà sữa BoBa. Nhận đơn nhanh gọn, tính tiền theo menu, hỏi topping và địa chỉ giao. Giọng trẻ trung.",
    docs: [
      { id: "d1", type: "sheet", name: "Menu & giá topping", meta: "Google Sheets · 42 dòng" },
      { id: "d2", type: "link", name: "Khu vực giao hàng", meta: "boba.vn/ship" },
    ],
    model: "Claude Haiku", hours: "09:00 – 23:00", fallback: ["Đơn trên 500k", "Khiếu nại"],
  },
};

export function defaultAutoReply(model: AutoReplyConfig["model"]): AutoReplyConfig {
  return {
    enabled: false,
    prompt: "Bạn là trợ lý CSKH thân thiện. Trả lời ngắn gọn, lịch sự, dựa trên tài liệu được cung cấp. Khi không chắc chắn, đề nghị chuyển cho nhân viên.",
    docs: [], model, hours: "08:00 – 22:00", fallback: ["Khách yêu cầu gặp người thật"],
  };
}

const MEMBER_POOL: ReadonlyArray<Omit<GroupMember, "admin">> = [
  { name: "Nguyễn Văn An", initials: "VA", hue: 200 }, { name: "Trần Thị Bình", initials: "TB", hue: 320 },
  { name: "Lê Hoàng Cường", initials: "HC", hue: 150 }, { name: "Phạm Mỹ Duyên", initials: "MD", hue: 300 },
  { name: "Vũ Đức Em", initials: "ĐE", hue: 40 }, { name: "Đỗ Thu Giang", initials: "TG", hue: 96 },
  { name: "Bùi Quốc Huy", initials: "QH", hue: 230 }, { name: "Hồ Lan Khanh", initials: "LK", hue: 350 },
];

export function getMembers(convoId: string, count: number, ownerInitials: string): { list: ReadonlyArray<GroupMember>; total: number } {
  const n = Math.min(count, MEMBER_POOL.length);
  const seed = convoId.charCodeAt(1) || 0;
  const list: GroupMember[] = [{ name: "Tài khoản này", initials: ownerInitials, hue: 152, admin: true }];
  for (let i = 0; i < n; i += 1) {
    const m = MEMBER_POOL[(seed + i) % MEMBER_POOL.length];
    if (m) list.push(m);
  }
  return { list, total: count + 1 };
}

export type { Friend };
