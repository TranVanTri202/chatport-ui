import type { SVGProps } from "react";

export type IconName =
  | "dashboard" | "chat" | "bot" | "users" | "settings" | "plus" | "dot" | "sparkle"
  | "alert" | "qr" | "addr" | "search" | "send" | "image" | "paperclip" | "x" | "check"
  | "chevD" | "arrowL" | "info" | "phone" | "link" | "trash" | "doc" | "sheet" | "edit"
  | "camera" | "userPlus" | "userCheck" | "handoff" | "clock" | "download" | "globe" | "eye" | "eyeOff" | "logout";

const P: Record<IconName, JSX.Element> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/>,
  bot: <><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="13" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.1" fill="currentColor" stroke="none"/></>,
  users: <><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6M18.5 19a5 5 0 0 0-3-4.6"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>,
  sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M12 7.5 13.6 11l3.5 1.6-3.5 1.6L12 17.6 10.4 14l-3.5-1.6L10.4 11z" fill="currentColor" stroke="none"/></>,
  alert: <><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M20 14v.01M14 20h.01M17 20h.01M20 17v3"/></>,
  addr: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8H2M4 12H2M4 16H2"/><circle cx="12" cy="10" r="2.4"/><path d="M8.5 16a3.5 3.5 0 0 1 7 0"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></>,
  send: <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-4.5-4.5L5 21"/></>,
  paperclip: <path d="M21.4 11.05 12.25 20.2a5 5 0 0 1-7.07-7.07l9.2-9.2a3.3 3.3 0 0 1 4.67 4.67l-9.2 9.2a1.65 1.65 0 0 1-2.33-2.33l8.5-8.5"/>,
  x: <path d="M18 6 6 18M6 6l12 12"/>,
  check: <path d="M20 6 9 17l-5-5"/>,
  chevD: <path d="m6 9 6 6 6-6"/>,
  arrowL: <><path d="M19 12H5M12 19l-7-7 7-7"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/>,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
  trash: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>,
  doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  sheet: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18M16 3v18"/></>,
  edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></>,
  userPlus: <><circle cx="9" cy="8" r="3.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M19 8v6M22 11h-6"/></>,
  userCheck: <><circle cx="9" cy="8" r="3.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="m16.5 11.5 2 2 3.5-3.5"/></>,
  handoff: <><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="m16 11 3 3-3 3M5 14h14"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4M6.6 6.6A18 18 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4.1-.8M3 3l18 18"/><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2"/></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  readonly name: IconName;
  readonly size?: number;
}

export function Icon({ name, size = 18, ...rest }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {P[name]}
    </svg>
  );
}
