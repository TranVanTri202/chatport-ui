"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface ModalProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly width?: number;
}

export function Modal({ title, onClose, children, width = 420 }: ModalProps): JSX.Element {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[84vh] flex-col rounded-[18px] border border-border bg-surface p-[22px] shadow-2xl"
        style={{ width }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-[9px] border border-border text-muted hover:text-text">
            <Icon name="x" size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
