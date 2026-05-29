import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for modals — keeps Tab/Shift+Tab inside the modal,
 * auto-focuses the first interactive element when the trap becomes active,
 * restores focus to the previously focused element when it deactivates,
 * and closes on Escape key if onClose is provided.
 *
 * `onClose` is stored in a ref so passing an inline function does NOT retrigger
 * the effect on every render (which previously stole focus from inputs — typing
 * "letter by letter"). Pass `active` for components that keep the hook mounted
 * while toggling visibility internally (e.g. a floating widget); it defaults to
 * true so modals that mount/unmount keep working unchanged.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  onClose?: () => void,
  active: boolean = true,
) {
  const ref = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose; // always latest, without retriggering the effect

  useEffect(() => {
    if (!active) return;
    const modal = ref.current;
    if (!modal) return;

    // Save the element that had focus before the modal opened
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => modal.querySelectorAll<HTMLElement>(focusableSelector);
    getFocusable()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
  }, [active]);

  return ref;
}
