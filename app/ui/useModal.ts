"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';

let lockCount = 0;
let savedOverflow = "";

function lockScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = savedOverflow;
}

/**
 * Shared modal behaviour: Escape closes, Tab stays inside the dialog, focus
 * returns to whatever opened it, and the page behind stops scrolling.
 */
export function useModal(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null>,
  { escape = true, lock = true }: { escape?: boolean; lock?: boolean } = {},
) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (lock) lockScroll();

    const focusFirst = window.setTimeout(() => {
      const dialog = ref.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      const target = dialog.querySelector<HTMLElement>("[data-autofocus]") ??
        dialog.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? dialog).focus({ preventScroll: true });
    }, 30);

    const handleKey = (event: KeyboardEvent) => {
      const dialog = ref.current;
      if (!dialog) return;
      if (event.key === "Escape" && escape) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null || item === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey, true);
    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener("keydown", handleKey, true);
      if (lock) unlockScroll();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [escape, lock, open, ref]);
}
