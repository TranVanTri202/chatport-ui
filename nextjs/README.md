# ZaloHub — Next.js 14 (App Router) + TypeScript

Trung tâm điều phối nhiều tài khoản Zalo với trợ lý AI. Dựng theo kiến trúc
**feature-based + clean architecture**, strict TypeScript, Tailwind token hoá.
**Toàn bộ giao diện đã được hiện thực** (Đăng nhập, Tổng quan, Tin nhắn, Danh bạ,
Auto Reply, Tài khoản, Cài đặt).

## Chạy

```bash
cd nextjs
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # strict, không có any
```

## 4 quy tắc kiến trúc

1. **Cấu trúc thư mục** — `components/ui/` (Avatar, Button, Toggle, StatusPill,
   Badge, Icon, Modal, SearchBox) · `components/common/` (AppShell, NavRail) ·
   theo tính năng (`components/dashboard|chat|contacts|auto-reply|accounts|settings|auth/`).
2. **Tách logic/UI** — state & xử lý nằm trong `hooks/` (`useAccounts`,
   `usePreferences`, `useChat`, `useContacts`) + `providers/AppProvider`. View chỉ
   bố cục. Ghi dữ liệu qua **Server Action** (`app/auto-reply/actions.ts`).
3. **Tailwind token hoá** — màu/bóng/bo góc là CSS vars trong `globals.css`, map
   trong `tailwind.config.ts` (`bg-surface`, `text-muted`, `text-accent`…). Không
   hardcode hex trong component. `tsconfig` bật `strict` + `noUncheckedIndexedAccess`,
   **không `any`**.
4. **Mock data tập trung** — tất cả trong `constants/mockData.ts`, ép kiểu theo `types/`.

## Cấu trúc

```
src/
├── app/                    layout, globals.css, route mỗi màn, auto-reply/actions.ts
├── components/
│   ├── ui/                 nguyên tử dùng chung
│   ├── common/             AppShell (gate đăng nhập) + NavRail
│   ├── auth/               LoginView
│   ├── dashboard/          DashboardView, AccountCard, StatCard
│   ├── chat/               ChatView (bot dropdown, tìm kiếm, gửi ảnh/file) + ChatInfoPanel (bạn bè / nhóm)
│   ├── contacts/           ContactsView
│   ├── auto-reply/         AutoReplyView (lưu từng mục, thêm tài liệu)
│   ├── accounts/           AccountsView + QrModal (đăng nhập lại)
│   └── settings/           SettingsView
├── hooks/                  useAccounts, usePreferences, useChat, useContacts
├── providers/              AppProvider (auth + accounts + preferences)
├── constants/              mockData.ts, i18n.ts
├── lib/                    format.ts
└── types/                  index.ts
```

## Ghi chú

- Sáng/Tối qua `data-theme`; màu nhấn, mật độ, ngôn ngữ điều khiển ở **Cài đặt**
  (`usePreferences` là nơi duy nhất chạm DOM).
- Prototype HTML kèm theo là **tài liệu thiết kế tham chiếu**; bản Next.js này là
  điểm khởi đầu production. Khi nối API thật chỉ cần thay nguồn dữ liệu trong hook,
  giữ nguyên signature.
