"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface ModalProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly width?: number;
  readonly noPadding?: boolean;
}

export function Modal({ title, onClose, children, width = 420, noPadding = false }: ModalProps): JSX.Element {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[84vh] flex-col rounded-[18px] border border-border bg-surface shadow-2xl ${
          noPadding ? "p-0 overflow-hidden" : "p-[22px]"
        }`}
        style={{ width }}
      >
        <div className={`flex items-center justify-between ${
          noPadding 
            ? "p-[14px_22px] border-b border-border bg-surface-0" 
            : "mb-4"
        }`}>
          <h2 className="font-display text-[16.5px] font-semibold">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-[9px] border border-border text-muted hover:text-text">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className={noPadding ? "overflow-y-auto min-h-0 flex-1 no-scrollbar" : "min-h-0 flex-1 overflow-y-auto"}>
          {children}
        </div>
      </div>
    </div>
  );
}
