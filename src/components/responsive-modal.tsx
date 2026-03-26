"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Use full-height drawer for content-heavy modals like recipe pickers */
  tall?: boolean;
}

export function ResponsiveModal({ open, onClose, children, tall }: ResponsiveModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!open) return null;

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Drawer.Content
            className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-xl bg-card ${tall ? "max-h-[85vh]" : "max-h-[70vh]"}`}
          >
            <div className="mx-auto mt-3 mb-2 h-1.5 w-12 rounded-full bg-border" />
            <div className={`flex-1 ${tall ? "overflow-y-auto" : ""} px-4 pb-6`}>
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop: centered dialog
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="paper-card p-6 max-w-sm w-full space-y-4">
        {children}
      </div>
    </div>
  );
}
