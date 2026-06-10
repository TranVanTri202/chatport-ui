"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ReadonlyArray<Toast>>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          let iconName: "check" | "alert" | "info" = "info";
          let bgClass = "bg-surface-3/90 border-border text-text";
          let iconColor = "text-accent";

          if (toast.type === "success") {
            iconName = "check";
            bgClass = "bg-[#0c2e1f]/90 border-accent/20 text-[#aeead7]";
            iconColor = "text-accent";
          } else if (toast.type === "error") {
            iconName = "alert";
            bgClass = "bg-[#331414]/90 border-danger/20 text-[#fca5a5]";
            iconColor = "text-danger";
          } else if (toast.type === "warning") {
            iconName = "alert";
            bgClass = "bg-[#2b1f0d]/90 border-warning/20 text-[#fde047]";
            iconColor = "text-warning";
          }

          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 animate-slide-in pointer-events-auto ${bgClass}`}
            >
              <span className={`shrink-0 ${iconColor}`}>
                <Icon name={iconName} size={15} />
              </span>
              <div className="text-[13px] font-medium leading-relaxed">{toast.message}</div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="ml-auto p-0.5 opacity-60 hover:opacity-100 transition-opacity text-muted hover:text-text cursor-pointer"
                type="button"
              >
                <Icon name="x" size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
