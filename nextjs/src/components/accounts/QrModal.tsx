"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api";

interface QrModalProps {
  readonly relogin: boolean;
  readonly accountName?: string;
  readonly onClose: () => void;
  readonly onConnect: () => void;
}

type Phase = "loading" | "scan" | "done";

export function QrModal({ relogin, accountName, onClose, onConnect }: QrModalProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>("loading");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    let active = true;

    // Start background login request
    api.post("/channels/zalo/login")
      .then(() => {
        if (!active) return;
        setPhase("done");
        setTimeout(() => {
          if (active) onConnect();
        }, 1200);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Kết nối Zalo thất bại");
      });

    // Poll for QR image
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get<{ qrBase64: string }>("/channels/zalo/qr");
        if (!active) return;
        if (res.qrBase64) {
          setQrImage(res.qrBase64);
          setPhase("scan");
        }
      } catch (e) {
        // Zalo client may still be initializing, keep polling
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [retryTrigger, onConnect]);

  return (
    <Modal title={relogin ? "Đăng nhập lại bot" : "Đăng nhập bằng QR"} onClose={onClose}>
      <p className="mb-5 text-[13px] text-muted">
        {relogin && accountName ? `Quét lại bằng Zalo “${accountName}” để khôi phục phiên` : "Quét mã bằng Zalo trên điện thoại"}
      </p>
      
      <div className="mb-5 grid place-items-center">
        <div className="relative grid h-[200px] w-[200px] place-items-center overflow-hidden rounded-[18px] bg-white border border-border-soft">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0d0c] p-4 text-center text-white">
              <Icon name="alert" size={28} className="text-danger mb-2" />
              <span className="text-[13px] font-semibold text-danger mb-1">Đăng nhập thất bại</span>
              <span className="text-[11.5px] text-muted mb-4 line-clamp-2">{error}</span>
              <Button
                size="sm"
                onClick={() => {
                  setError(null);
                  setQrImage(null);
                  setPhase("loading");
                  setRetryTrigger((prev) => prev + 1);
                }}
              >
                Thử lại
              </Button>
            </div>
          ) : phase === "loading" ? (
            <div className="flex flex-col items-center gap-3 text-black">
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/20 border-t-accent" />
              <span className="text-[13px] text-muted">Đang tạo mã QR…</span>
            </div>
          ) : (
            <>
              {qrImage ? (
                <img src={qrImage} alt="Zalo QR Code" className="h-[170px] w-[170px] object-contain" />
              ) : null}
              {phase === "done" ? (
                <div className="absolute inset-0 grid place-items-center bg-black/80 text-white">
                  <div className="flex flex-col items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-[#06140c]">
                      <Icon name="check" size={26} />
                    </span>
                    <span className="text-[13px] font-semibold text-accent">Đã kết nối!</span>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      
      <p className="mb-5 text-center text-[12.5px] text-muted">Mở Zalo › Cài đặt › Quét mã QR</p>
    </Modal>
  );
}

