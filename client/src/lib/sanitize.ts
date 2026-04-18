/**
 * Input sanitization — strip HTML tags to prevent XSS
 * Lightweight alternative to DOMPurify for text-only fields.
 */
export function sanitize(text: string): string {
  if (!text) return text;
  // Strip all HTML tags
  return text.replace(/<[^>]*>/g, '');
}
