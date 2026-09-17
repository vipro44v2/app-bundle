"use client";
import { useEffect, useRef, type ReactNode } from "react";
export default function ConfirmDialog({
  title,
  children,
  busy = false,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  busy?: boolean;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      <div id="confirm-description">{children}</div>
      <div className="dialog-actions">
        <button
          type="button"
          className="secondary"
          autoFocus
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={destructive ? "destructive" : "primary"}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
