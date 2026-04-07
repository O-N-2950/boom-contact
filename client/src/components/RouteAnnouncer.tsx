import { useEffect, useRef } from 'react';

interface RouteAnnouncerProps {
  message?: string;
}

/**
 * RouteAnnouncer announces page changes to screen readers
 * Uses aria-live="assertive" for immediate announcements
 */
export function RouteAnnouncer({ message }: RouteAnnouncerProps) {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  }, [message]);

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
  );
}
