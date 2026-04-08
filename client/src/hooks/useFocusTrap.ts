import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for modals — keeps Tab/Shift+Tab inside the modal,
 * auto-focuses the first interactive element on mount,
 * restores focus to the previously focused element on unmount,
 * and closes on Escape key if onClose is provided.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(onClose?: () => void) {
  const ref = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Save the element that had focus before the modal opened
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const modal = ref.current;
    if (!modal) return;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = modal.querySelectorAll<HTMLElement>(focusableSelector);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    modal.addEventListener('keydown', handleKeyDown);
    return () => {
      modal.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that was focused before the modal opened
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  return ref;
}
