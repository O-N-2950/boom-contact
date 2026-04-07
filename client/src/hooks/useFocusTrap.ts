import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for modals — keeps Tab/Shift+Tab inside the modal
 * and auto-focuses the first interactive element on mount.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const modal = ref.current;
    if (!modal) return;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = modal.querySelectorAll<HTMLElement>(focusableSelector);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    modal.addEventListener('keydown', trap);
    return () => modal.removeEventListener('keydown', trap);
  }, []);

  return ref;
}
