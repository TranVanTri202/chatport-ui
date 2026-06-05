import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "ghost" | "soft" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-[#0a1f16] font-semibold shadow-card",
  ghost: "bg-transparent text-text border border-border",
  soft: "bg-surface-3 text-text border border-border",
  danger: "bg-transparent text-danger border border-[rgba(217,104,95,.3)]",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-[10px]",
  md: "px-4 py-2 text-sm gap-2 rounded-[10px]",
  lg: "px-5 py-3 text-[15px] gap-2 rounded-[13px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly icon?: IconName;
  readonly children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      className={`inline-flex items-center justify-center font-sans transition active:scale-[.97] ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 14 : 16} /> : null}
      {children}
    </button>
  );
}
